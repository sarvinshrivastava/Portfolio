import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Guards a bug that was actually observed in production: a client-side route
 * change keeps the previous scroll position, so arriving at the bottom of a new
 * page would credit 25/50/75/100 instantly, before the visitor read a word.
 *
 * jsdom has no layout engine, so all geometry is faked and requestAnimationFrame
 * is replaced with a queue we drain by hand. These are therefore ARITHMETIC
 * tests of the threshold/baseline logic — they cannot reproduce real frame
 * ordering or the browser's own scroll clamping on navigation.
 */

const analytics = vi.hoisted(() => ({
  track: vi.fn(),
  trackOnce: vi.fn(),
}));
vi.mock('../../src/lib/analytics', () => analytics);

const { useScrollDepth } = await import('../../src/hooks/useScrollDepth');

// ── Fake frame scheduler ────────────────────────────────────────────────────
let nextFrameId = 1;
const frames = new Map<number, FrameRequestCallback>();

function flushFrames() {
  const queued = [...frames.entries()];
  frames.clear();
  for (const [, cb] of queued) cb(0);
}

// ── Fake layout ─────────────────────────────────────────────────────────────
function setGeometry(opts: { scrollHeight?: number; innerHeight?: number; scrollY?: number }) {
  if (opts.scrollHeight !== undefined) {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: opts.scrollHeight,
      configurable: true,
    });
  }
  if (opts.innerHeight !== undefined) {
    Object.defineProperty(window, 'innerHeight', {
      value: opts.innerHeight,
      configurable: true,
      writable: true,
    });
  }
  if (opts.scrollY !== undefined) {
    Object.defineProperty(window, 'scrollY', {
      value: opts.scrollY,
      configurable: true,
      writable: true,
    });
  }
}

/**
 * jsdom swallows an exception thrown inside an event listener into a window
 * `error` event, so a throwing scroll handler would otherwise show up as an
 * opaque "unhandled error" long after the test that caused it. Capture them and
 * assert on them by name instead.
 */
const listenerErrors: string[] = [];
function captureListenerError(event: ErrorEvent) {
  listenerErrors.push(event.error?.message ?? event.message);
  event.preventDefault();
}

function scrollTo(y: number) {
  setGeometry({ scrollY: y });
  window.dispatchEvent(new Event('scroll'));
  flushFrames();
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ['/projects'] }, children);
}

/** Mount the hook and let the arrival-baseline frame run. */
function mountAtRest() {
  const view = renderHook(() => useScrollDepth(), { wrapper });
  flushFrames();
  return view;
}

/** Every pct reported so far, in order. */
function reported(): unknown[] {
  return analytics.trackOnce.mock.calls.map(call => (call[2] as { pct: number }).pct);
}

beforeEach(() => {
  analytics.trackOnce.mockClear();
  nextFrameId = 1;
  frames.clear();
  listenerErrors.length = 0;
  window.addEventListener('error', captureListenerError);

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextFrameId++;
    frames.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => void frames.delete(id));

  // jsdom ships no ResizeObserver; the hook observes documentElement to
  // re-derive its baseline when late content grows the page.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  // A 4000px document in a 1000px viewport → 3000px of scrollable distance.
  setGeometry({ scrollHeight: 4000, innerHeight: 1000, scrollY: 0 });
});

afterEach(() => {
  // Unmount before asserting: a throwing assertion aborts the remaining
  // afterEach hooks, so RTL's own cleanup would never run and the hook's scroll
  // listener would leak into every later test.
  cleanup();
  window.removeEventListener('error', captureListenerError);
  vi.unstubAllGlobals();
  // The hook's own listeners must never throw — a scroll handler that blows up
  // silently stops reporting for the rest of the visit.
  expect(listenerErrors).toEqual([]);
});

describe('useScrollDepth', () => {
  it('reports only the thresholds actually scrolled past', () => {
    mountAtRest(); // baseline 0%

    scrollTo(1500); // 50%

    expect(reported()).toEqual([25, 50]);
  });

  it('reports nothing when the route is entered already near the bottom', () => {
    setGeometry({ scrollY: 2970 }); // ~99% — carried over from the previous route
    mountAtRest();

    // The browser fires a clamping scroll event on arrival; it must not count.
    window.dispatchEvent(new Event('scroll'));
    flushFrames();

    expect(reported()).toEqual([]);
  });

  it('reports exactly one event when the visitor scrolls past an already-deep arrival', () => {
    setGeometry({ scrollY: 2970 }); // ~99%
    mountAtRest();

    scrollTo(3000); // true bottom

    expect(analytics.trackOnce).toHaveBeenCalledTimes(1);
    expect(analytics.trackOnce.mock.calls[0][2]).toEqual({ pct: 100, path: '/projects' });
  });

  it('reports nothing and does not throw on a page shorter than the viewport', () => {
    setGeometry({ scrollHeight: 500, innerHeight: 1000, scrollY: 0 });
    mountAtRest();

    expect(() => scrollTo(0)).not.toThrow();
    expect(reported()).toEqual([]);
  });
});
