// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UPSTREAM, config, createHandler } from '../../netlify/edge-functions/resume-pdf';
import { PROBE_TIMEOUT_MS } from '../../src/lib/resumeAvailability';

const enc = new TextEncoder();
const PDF = enc.encode('%PDF-1.4\nbody bytes');
const ETAG = `"${'ab12'.repeat(16)}"`;

interface StreamOpts {
  cancel?: () => void | PromiseLike<void>;
  hang?: boolean;
  signal?: AbortSignal | null;
  onAbort?: 'error' | 'close';
}

/** A body stream: emits `chunks`, then closes (or never does, with `hang`). */
function stream(chunks: Uint8Array[], { cancel, hang, signal, onAbort = 'error' }: StreamOpts = {}) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    start(c) {
      signal?.addEventListener('abort', () => {
        if (onAbort === 'error') c.error(new DOMException('Aborted', 'AbortError'));
        else c.close();
      });
    },
    pull(c) {
      if (i < chunks.length) c.enqueue(chunks[i++]);
      else if (!hang) c.close();
    },
    cancel,
  });
}

const upstreamRes = (
  body: BodyInit | null,
  { status = 200, headers = {} as Record<string, string> } = {},
) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'application/pdf', etag: ETAG, ...headers },
  });

const asFetch = (impl: (url: string, init?: RequestInit) => unknown) =>
  vi.fn(impl) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

const get = (url = 'https://x.test/resume.pdf', init?: RequestInit) => new Request(url, init);

const lower = (h: Headers) => {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    if (k !== 'content-length') out[k] = v; // the runtime adds it; not asserted
  });
  return out;
};

const FAILURE = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'no-store',
  'netlify-cdn-cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

async function expect503(res: Response) {
  expect(res.status).toBe(503);
  expect(lower(res.headers)).toEqual(FAILURE);
  expect(await res.text()).toBe('resume unavailable');
}

afterEach(() => {
  vi.useRealTimers();
});

describe('resume-pdf edge gate', () => {
  it('serves a PDF with exactly the gate headers and forwards nothing from the visitor', async () => {
    const fetchImpl = asFetch(async () =>
      upstreamRes(PDF, { headers: { 'content-type': 'Application/PDF; charset=binary' } }),
    );
    const res = await createHandler({ fetchImpl })(
      get('https://x.test/resume.pdf?x=../api/cache', {
        headers: { cookie: 'a=b', authorization: 'Bearer t', 'if-none-match': ETAG },
      }),
    );

    expect(res.status).toBe(200);
    expect(lower(res.headers)).toEqual({
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="Sarvin-Shrivastava-Resume.pdf"',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, max-age=300, stale-while-revalidate=86400',
      etag: ETAG,
    });
    for (const h of ['content-security-policy', 'set-cookie', 'location']) {
      expect(res.headers.has(h)).toBe(false);
    }
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(UPSTREAM, {
      method: 'GET',
      redirect: 'manual',
      signal: expect.any(AbortSignal),
    });
  });

  it('passes on only a well-formed upstream ETag', async () => {
    const fetchImpl = asFetch(async () => upstreamRes(PDF, { headers: { etag: 'W/"abc"' } }));
    const res = await createHandler({ fetchImpl })(get());

    expect(res.status).toBe(200);
    expect(res.headers.has('etag')).toBe(false);
  });

  it.each([
    ['a missing content-type', {}],
    ['text/html', { 'content-type': 'text/html' }],
    ['application/pdfx', { 'content-type': 'application/pdfx' }],
  ])('answers 503 for %s', async (_label, headers) => {
    const cancel = vi.fn();
    const fetchImpl = asFetch(
      async () =>
        new Response(stream([PDF], { cancel }), {
          status: 200,
          headers: headers as Record<string, string>,
        }),
    );
    await expect503(await createHandler({ fetchImpl })(get()));
    expect(cancel).toHaveBeenCalled();
  });

  it('answers 503 when the body does not start with %PDF-', async () => {
    const fetchImpl = asFetch(async () => upstreamRes(enc.encode('<html>nope</html>')));
    await expect503(await createHandler({ fetchImpl })(get()));
  });

  it('answers 503 for a redirect, an opaque redirect, a 404 and a 503', async () => {
    const cases: Array<() => Response> = [
      () => upstreamRes('x', { status: 302, headers: { location: 'https://evil.test/' } }),
      () => Response.error(),
      () => upstreamRes('x', { status: 404 }),
      () => upstreamRes('x', { status: 503 }),
    ];
    for (const make of cases) {
      const res = await createHandler({ fetchImpl: asFetch(async () => make()) })(get());
      await expect503(res);
      expect(res.headers.has('location')).toBe(false);
    }
  });

  it('cancels the upstream body on every 503 path that has one', async () => {
    for (const make of [
      (cancel: () => void) =>
        new Response(stream([PDF], { cancel }), { status: 404, headers: { 'content-type': 'application/pdf' } }),
      (cancel: () => void) =>
        new Response(stream([PDF], { cancel }), { status: 200, headers: { 'content-type': 'text/html' } }),
    ]) {
      const cancel = vi.fn();
      await expect503(
        await createHandler({ fetchImpl: asFetch(async () => make(cancel)) })(get()),
      );
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  });

  it('enforces the size cap: maxBytes passes, maxBytes + 1 is a 503 and cancels the reader', async () => {
    const body = (n: number) => {
      const b = new Uint8Array(n).fill(0x41);
      b.set(enc.encode('%PDF-'));
      return b;
    };
    const ok = await createHandler({
      fetchImpl: asFetch(async () => upstreamRes(body(100))),
      maxBytes: 100,
    })(get());
    expect(ok.status).toBe(200);
    expect((await ok.arrayBuffer()).byteLength).toBe(100);

    const cancel = vi.fn();
    const big = await createHandler({
      fetchImpl: asFetch(
        async () => new Response(stream([body(101)], { cancel, hang: true }), { headers: { 'content-type': 'application/pdf' } }),
      ),
      maxBytes: 100,
    })(get());
    await expect503(big);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('answers 503 at the deadline when the body stalls', async () => {
    vi.useFakeTimers();
    const fetchImpl = asFetch(
      async (_url, init) =>
        new Response(stream([PDF.slice(0, 5)], { hang: true, signal: init?.signal }), {
          headers: { 'content-type': 'application/pdf' },
        }),
    );
    const pending = createHandler({ fetchImpl, deadlineMs: 1000 })(get());
    await vi.advanceTimersByTimeAsync(999);
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect503(await pending);
  });

  it('answers 503 at the deadline when the headers stall', async () => {
    vi.useFakeTimers();
    const fetchImpl = asFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const pending = createHandler({ fetchImpl, deadlineMs: 1000 })(get());
    await vi.advanceTimersByTimeAsync(1000);

    await expect503(await pending);
  });

  it('never turns a read that ends done after the abort into a 200', async () => {
    vi.useFakeTimers();
    const fetchImpl = asFetch(
      async (_url, init) =>
        new Response(
          stream([PDF.slice(0, 5)], { hang: true, signal: init?.signal, onAbort: 'close' }),
          { headers: { 'content-type': 'application/pdf' } },
        ),
    );
    const pending = createHandler({ fetchImpl, deadlineMs: 1000 })(get());
    await vi.advanceTimersByTimeAsync(1000);

    await expect503(await pending);
  });

  it('leaves no timer behind after a success or a 503', async () => {
    vi.useFakeTimers();
    const ok = await createHandler({ fetchImpl: asFetch(async () => upstreamRes(PDF)) })(get());
    await ok.arrayBuffer();
    expect(vi.getTimerCount()).toBe(0);

    await createHandler({ fetchImpl: asFetch(async () => upstreamRes('x', { status: 503 })) })(get());
    expect(vi.getTimerCount()).toBe(0);
  });

  it('answers 503 when fetchImpl throws synchronously', async () => {
    const fetchImpl = asFetch(() => {
      throw new Error('boom');
    });
    await expect503(await createHandler({ fetchImpl })(get()));
  });

  it.each(['POST', 'PUT', 'OPTIONS'])('answers 405 to %s without calling upstream', async method => {
    const fetchImpl = asFetch(async () => upstreamRes(PDF));
    const res = await createHandler({ fetchImpl })(get(undefined, { method }));

    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
    expect(res.headers.get('netlify-cdn-cache-control')).toBe('no-store');
    expect(await res.text()).toBe('method not allowed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('answers HEAD with a bodiless 200 that is never stored, fetching upstream with GET', async () => {
    const fetchImpl = asFetch(async () => upstreamRes(PDF));
    const res = await createHandler({ fetchImpl })(get(undefined, { method: 'HEAD' }));

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('netlify-cdn-cache-control')).toBe('no-store');
    expect(fetchImpl).toHaveBeenCalledWith(UPSTREAM, expect.objectContaining({ method: 'GET' }));
  });

  it('answers HEAD with a 503 when upstream is text/html', async () => {
    const fetchImpl = asFetch(
      async () => upstreamRes('<html>', { headers: { 'content-type': 'text/html' } }),
    );
    const res = await createHandler({ fetchImpl })(get(undefined, { method: 'HEAD' }));

    expect(res.status).toBe(503);
  });

  it('has no unhandled rejection when upstream cancel rejects on the non-200, cap and %PDF- paths', async () => {
    const spy = vi.fn();
    process.on('unhandledRejection', spy);
    try {
      const cancel = () => Promise.reject(new Error('cancel failed'));
      const handlers = [
        createHandler({
          fetchImpl: asFetch(async () => new Response(stream([PDF], { cancel }), { status: 404 })),
        }),
        createHandler({
          fetchImpl: asFetch(
            async () =>
              new Response(stream([PDF], { cancel, hang: true }), {
                headers: { 'content-type': 'application/pdf' },
              }),
          ),
          maxBytes: 4,
        }),
        createHandler({
          fetchImpl: asFetch(
            async () =>
              new Response(stream([enc.encode('<html>')], { cancel }), {
                headers: { 'content-type': 'application/pdf' },
              }),
          ),
        }),
      ];
      for (const h of handlers) expect((await h(get())).status).toBe(503);
      await new Promise(r => setTimeout(r, 20));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', spy);
    }
  });

  it('exports the Netlify config and a deadline shorter than the client probe', async () => {
    expect(config).toEqual({ path: '/resume.pdf', cache: 'manual' });

    vi.useFakeTimers();
    const fetchImpl = asFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const pending = createHandler({ fetchImpl })(get());
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS - 1);

    expect((await pending).status).toBe(503);
  });
});
