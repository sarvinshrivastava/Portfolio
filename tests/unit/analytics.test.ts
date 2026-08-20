import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Contract tests for the analytics wrapper. Three things here are easy to
 * regress and impossible to notice in production (the whole point of the file
 * is to be silent):
 *
 *  - it must be a no-op outside PROD, so `vite dev` never pollutes the dashboard;
 *  - it must never throw when the tracker is blocked or not yet loaded;
 *  - `trackOnce` must actually dedupe.
 *
 * Two vitest-specific traps, both load-bearing below:
 *  1. the PROD flag is FALSE under vitest, so without `vi.stubEnv('PROD', true)`
 *     every single assertion would pass vacuously.
 *  2. the module keeps a top-level `fired` Set and a `pending` queue, so state
 *     leaks between tests unless each one does `vi.resetModules()` + a fresh
 *     dynamic `import()`.
 */

type TrackSpy = ReturnType<typeof vi.fn>;

function installUmami(): TrackSpy {
  const track = vi.fn();
  window.umami = { track, identify: vi.fn() };
  return track;
}

function setReadyState(value: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', { value, configurable: true });
}

async function loadAnalytics() {
  vi.resetModules();
  return import('../../src/lib/analytics');
}

beforeEach(() => {
  vi.useFakeTimers();
  delete window.umami;
  setReadyState('complete');
});

afterEach(() => {
  vi.useRealTimers();
  delete window.umami;
});

describe('analytics', () => {
  it('sends nothing outside PROD even when the tracker is present', async () => {
    const umamiTrack = installUmami(); // PROD deliberately left false
    const { track, trackOnce } = await loadAnalytics();

    track('resume_open', { source: 'navbar' });
    trackOnce('k', 'contact_form_start');

    expect(umamiTrack).not.toHaveBeenCalled();
  });

  it('does not throw and does not shadow window.umami when the tracker is blocked', async () => {
    vi.stubEnv('PROD', true);
    const { track } = await loadAnalytics();

    expect(() => track('contact_form_submit')).not.toThrow();

    // Assigning a stub to window.umami would permanently shadow the real
    // tracker, which installs itself with `window.umami || (window.umami = …)`.
    expect(window.umami).toBeUndefined();

    // An ad-blocked visitor must not be kept awake by an infinite retry loop.
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('trackOnce fires at most once for the same key', async () => {
    vi.stubEnv('PROD', true);
    const umamiTrack = installUmami();
    const { trackOnce } = await loadAnalytics();

    for (let i = 0; i < 3; i++) {
      trackOnce('scroll_depth:/projects:50', 'scroll_depth', {
        pct: 50,
        path: '/projects',
      });
    }

    expect(umamiTrack).toHaveBeenCalledTimes(1);
    expect(umamiTrack).toHaveBeenCalledWith('scroll_depth', {
      pct: 50,
      path: '/projects',
    });
  });

  it('trackOnce keys are independent, so the same event fires again on another route', async () => {
    vi.stubEnv('PROD', true);
    const umamiTrack = installUmami();
    const { trackOnce } = await loadAnalytics();

    trackOnce('scroll_depth:/projects:50', 'scroll_depth', { pct: 50, path: '/projects' });
    trackOnce('scroll_depth:/projects:50', 'scroll_depth', { pct: 50, path: '/projects' });
    trackOnce('scroll_depth:/experience:50', 'scroll_depth', { pct: 50, path: '/experience' });

    expect(umamiTrack).toHaveBeenCalledTimes(2);
    expect(umamiTrack.mock.calls.map(c => c[1].path)).toEqual(['/projects', '/experience']);
  });

  it('buffers events emitted before the tracker exists and flushes them once on load', async () => {
    vi.stubEnv('PROD', true);
    setReadyState('loading'); // tracker script still pending
    const { track } = await loadAnalytics();

    track('data_load_error', { dataset: 'about', status: 503 });

    // Nothing can have been sent — there is nothing to send it with.
    expect(window.umami).toBeUndefined();

    const umamiTrack = installUmami();
    window.dispatchEvent(new Event('load'));

    expect(umamiTrack).toHaveBeenCalledTimes(1);
    expect(umamiTrack).toHaveBeenCalledWith('data_load_error', {
      dataset: 'about',
      status: 503,
    });

    // Draining must not re-deliver on the retry timers.
    vi.runAllTimers();
    expect(umamiTrack).toHaveBeenCalledTimes(1);
  });
});
