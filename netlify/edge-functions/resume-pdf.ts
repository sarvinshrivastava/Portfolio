/**
 * Edge gate for `/resume.pdf`: serves notion-cache's rendered resume to
 * visitors, and only ever as a PDF.
 *
 * Upstream contract: notion-cache `src/routes/resume.js` (`GET /resume.pdf`,
 * `application/pdf`, ETag `"<sha256 hex>"`). Netlify applies no `[[headers]]`
 * to proxied content or to edge-function responses, so a compromised upstream
 * could otherwise answer `text/html` on this origin. The barrier is this gate's
 * forced `Content-Type` plus `nosniff`; the upstream type and `%PDF-` checks
 * are sanity checks that turn a wrong answer into a 503.
 *
 * Web-standard APIs only (no `@netlify/*` or Deno import), and no top-level
 * side effects, so the handler is unit-testable under node.
 */

export const UPSTREAM = 'https://notion-cache.vps.sarvinshrivastava.space/resume.pdf';

/** No `method` filter: every method on this path is answered here, never by the SPA rewrite. */
export const config = { path: '/resume.pdf', cache: 'manual' };

/** Set by the gate, never copied from upstream. No CSP: a `sandbox` CSP stops Chrome's PDF viewer. */
const GATE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'inline; filename="Sarvin-Shrivastava-Resume.pdf"',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
};

const FAILURE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const ETAG = /^"[0-9a-f]{64}"$/;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

const failure = (status: number, body: string, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...FAILURE_HEADERS, ...extra } });

export interface HandlerOptions {
  fetchImpl?: typeof fetch;
  deadlineMs?: number;
  maxBytes?: number;
}

export function createHandler({
  fetchImpl = fetch,
  deadlineMs = 4000,
  maxBytes = 1024 * 1024,
}: HandlerOptions = {}): (req: Request) => Promise<Response> {
  return async req => {
    const fail = () => failure(503, 'resume unavailable');
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return failure(405, 'method not allowed', { Allow: 'GET, HEAD' });
      }

      // One deadline covers the headers and the body.
      const ctrl = new AbortController();
      const { signal } = ctrl;
      const timer = setTimeout(() => ctrl.abort(), deadlineMs);
      try {
        // No visitor header is forwarded and the query string is ignored. The
        // upstream is fetched with GET for HEAD too, so both apply the same checks.
        const upstream = await fetchImpl(UPSTREAM, { method: 'GET', redirect: 'manual', signal });

        const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (upstream.status !== 200 || type !== 'application/pdf') {
          void upstream.body?.cancel().catch(() => {});
          return fail();
        }
        if (!upstream.body) return fail();

        const reader = upstream.body.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            void reader.cancel().catch(() => {});
            return fail();
          }
          chunks.push(value);
        }
        // A read that ends `done: true` after the deadline must never become a 200.
        if (signal.aborted) return fail();

        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        if (!PDF_MAGIC.every((b, i) => bytes[i] === b)) return fail();

        // Only notion-cache's own ETag form is passed on; omitting it costs revalidation only.
        const etag = upstream.headers.get('etag');
        const headers: Record<string, string> = { ...GATE_HEADERS };
        if (etag && ETAG.test(etag)) headers.ETag = etag;

        if (req.method === 'HEAD') {
          // A bodiless response must never be stored under a key a GET could hit.
          headers['Netlify-CDN-Cache-Control'] = 'no-store';
          return new Response(null, { status: 200, headers });
        }
        return new Response(bytes, { status: 200, headers });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return fail();
    }
  };
}

export default createHandler();
