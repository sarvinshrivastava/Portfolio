// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({ track: vi.fn(), trackOnce: vi.fn() }));
vi.mock('../../src/lib/analytics', () => analytics);

const fetchMock = vi.fn();

const head = (status: number, contentType = 'application/pdf') =>
  new Response(null, { status, headers: { 'content-type': contentType } });

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
  it('is true for a 200 application/pdf, probed with HEAD on /resume.pdf', async () => {
    fetchMock.mockResolvedValue(head(200));
    const { checkResume } = await fresh();

    expect(await checkResume()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/resume.pdf', expect.objectContaining({ method: 'HEAD' }));
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

  it('is false for a 503 and reports resume_unavailable with 503', async () => {
    fetchMock.mockResolvedValue(head(503, 'text/plain'));
    const { checkResume } = await fresh();

    expect(await checkResume()).toBe(false);
    expect(analytics.trackOnce).toHaveBeenCalledWith('resume_unavailable', 'resume_unavailable', {
      status: 503,
    });
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
