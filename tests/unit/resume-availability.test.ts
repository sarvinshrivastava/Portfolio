// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({ track: vi.fn(), trackOnce: vi.fn() }));
vi.mock('../../src/lib/analytics', () => analytics);

const fetchMock = vi.fn();

const head = (status: number, contentType = 'application/pdf') =>
  new Response(null, { status, headers: { 'content-type': contentType } });

/** A response whose body reads and cancels can be observed or made to fail. */
function probeRes(
  status: number,
  contentType: string,
  { read = async () => new ArrayBuffer(0), cancel = async () => {} } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': contentType }),
    arrayBuffer: vi.fn(read),
    body: { cancel: vi.fn(cancel) },
  };
}

/**
 * The memo and last known value are module state, so each test gets a fresh
 * module graph. React, RTL and the router are imported after the reset too, so
 * they share one React instance with the Navbar under test; each test unmounts
 * its own tree because the global cleanup only knows the first instance.
 */
async function fresh() {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchMock);
  analytics.trackOnce.mockClear();
  const availability = await import('../../src/lib/resumeAvailability');
  const react = await import('react');
  const rtl = await import('@testing-library/react');
  const router = await import('react-router-dom');
  const { Navbar } = await import('../../src/components/layout/Navbar');
  return { ...availability, ...rtl, createElement: react.createElement, ...router, Navbar };
}

afterEach(() => {
  fetchMock.mockReset();
});

describe('resume availability', () => {
  it('is true for a 200 application/pdf, probed with a GET that lets the body finish', async () => {
    const res = probeRes(200, 'application/pdf');
    fetchMock.mockResolvedValue(res);
    const { checkResume } = await fresh();

    expect(await checkResume()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/resume.pdf', { signal: expect.any(AbortSignal) });
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('method');
    expect(res.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(res.body.cancel).not.toHaveBeenCalled();
    expect(analytics.trackOnce).not.toHaveBeenCalled();
  });

  it('is false for a 200 text/html (the SPA fallback)', async () => {
    fetchMock.mockResolvedValue(head(200, 'text/html'));
    const { checkResume, isResumeAvailable } = await fresh();

    expect(await checkResume()).toBe(false);
    expect(isResumeAvailable()).toBe(false);
    expect(analytics.trackOnce).toHaveBeenCalledWith('resume_unavailable', 'resume_unavailable', {
      status: 200,
    });
  });

  it('is false for a 503, cancels the body and reports resume_unavailable with 503', async () => {
    const res = probeRes(503, 'text/plain');
    fetchMock.mockResolvedValue(res);
    const { checkResume } = await fresh();

    expect(await checkResume()).toBe(false);
    expect(res.body.cancel).toHaveBeenCalledTimes(1);
    expect(res.arrayBuffer).not.toHaveBeenCalled();
    expect(analytics.trackOnce).toHaveBeenCalledWith('resume_unavailable', 'resume_unavailable', {
      status: 503,
    });
  });

  it('stays true, silent and unhandled-rejection free when the body read rejects', async () => {
    const spy = vi.fn();
    process.on('unhandledRejection', spy);
    try {
      const res = probeRes(200, 'application/pdf', {
        read: () => Promise.reject(new Error('read failed')),
      });
      fetchMock.mockResolvedValue(res);
      const { checkResume } = await fresh();

      expect(await checkResume()).toBe(true);
      await new Promise(r => setTimeout(r, 20));
      expect(analytics.trackOnce).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', spy);
    }
  });

  it('keeps status 503 (not -1) when cancelling the failed body rejects', async () => {
    const spy = vi.fn();
    process.on('unhandledRejection', spy);
    try {
      fetchMock.mockResolvedValue(
        probeRes(503, 'text/plain', { cancel: () => Promise.reject(new Error('cancel failed')) }),
      );
      const { checkResume } = await fresh();

      expect(await checkResume()).toBe(false);
      await new Promise(r => setTimeout(r, 20));
      expect(analytics.trackOnce).toHaveBeenCalledWith('resume_unavailable', 'resume_unavailable', {
        status: 503,
      });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', spy);
    }
  });

  it('reports -1 for a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { checkResume } = await fresh();

    expect(await checkResume()).toBe(false);
    expect(analytics.trackOnce).toHaveBeenCalledWith('resume_unavailable', 'resume_unavailable', {
      status: -1,
    });
  });

  it('starts true and is memoised: two checks make one fetch', async () => {
    fetchMock.mockResolvedValue(head(200));
    const { checkResume, isResumeAvailable } = await fresh();

    expect(isResumeAvailable()).toBe(true);
    await Promise.all([checkResume(), checkResume()]);
    await checkResume();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a hung probe as unavailable after 5 s, reporting -1 once', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const { checkResume, isResumeAvailable } = await fresh();

    const pending = checkResume();
    await vi.advanceTimersByTimeAsync(4999);
    expect(isResumeAvailable()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);

    expect(await pending).toBe(false);
    expect(isResumeAvailable()).toBe(false);
    expect(analytics.trackOnce).toHaveBeenCalledTimes(1);
    expect(analytics.trackOnce).toHaveBeenCalledWith('resume_unavailable', 'resume_unavailable', {
      status: -1,
    });
    vi.useRealTimers();
  });

  it('a hook mounted after the probe failed never renders the link', async () => {
    fetchMock.mockResolvedValue(head(503, 'text/plain'));
    const { checkResume, renderHook, useResumeAvailable } = await fresh();
    await checkResume();

    const { result, unmount } = renderHook(() => useResumeAvailable());
    expect(result.current).toBe(false);
    unmount();
  });

  it('the real hook starts true and becomes false on a 503', async () => {
    fetchMock.mockResolvedValue(head(503, 'text/plain'));
    const { renderHook, waitFor, useResumeAvailable } = await fresh();

    const { result, unmount } = renderHook(() => useResumeAvailable());
    expect(result.current).toBe(true);
    await waitFor(() => expect(result.current).toBe(false));
    unmount();
  });

  it('the real Navbar drops the desktop and the mobile resume anchor on a 503', async () => {
    fetchMock.mockResolvedValue(head(503, 'text/plain'));
    const { render, screen, waitFor, fireEvent, within, createElement, MemoryRouter, Navbar } =
      await fresh();

    const view = render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        createElement(Navbar, { theme: 'dark', onThemeToggle: () => {} }),
      ),
    );
    // Optimistic first paint, then the probe settles.
    expect(screen.getByRole('link', { name: /cv/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: /cv/ })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Mobile menu' });
    expect(within(dialog).queryByRole('link', { name: /resume/ })).toBeNull();
    view.unmount();
  });
});
