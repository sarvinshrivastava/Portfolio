import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * installErrorTracking reports through `track`, which lives in the same module
 * and is a no-op outside PROD. So: stub PROD, put a spy on window.umami, and
 * load a fresh module copy per test (the module keeps a pending queue).
 */

let umamiTrack: ReturnType<typeof vi.fn>;
let uninstall: (() => void) | undefined;

async function install() {
  vi.resetModules();
  const mod = await import('../../src/lib/analytics');
  uninstall = mod.installErrorTracking();
}

function rejectionEvent(reason: unknown): Event {
  if (typeof PromiseRejectionEvent !== 'undefined') {
    return new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason,
    });
  }
  const e = new Event('unhandledrejection');
  Object.defineProperty(e, 'reason', { value: reason });
  return e;
}

beforeEach(() => {
  vi.stubEnv('PROD', true);
  umamiTrack = vi.fn();
  window.umami = { track: umamiTrack, identify: vi.fn() };
});

afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  delete window.umami;
});

describe('installErrorTracking', () => {
  it('tracks a window error as js_error with message and file:line source', async () => {
    await install();

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', filename: 'x.js', lineno: 1 }));

    expect(umamiTrack).toHaveBeenCalledTimes(1);
    expect(umamiTrack).toHaveBeenCalledWith('js_error', { message: 'boom', source: 'x.js:1' });
  });

  it('tracks an unhandled rejection with an Error reason', async () => {
    await install();

    window.dispatchEvent(rejectionEvent(new Error('async boom')));

    expect(umamiTrack).toHaveBeenCalledTimes(1);
    expect(umamiTrack).toHaveBeenCalledWith('js_error', {
      message: 'async boom',
      source: 'unhandledrejection',
    });
  });

  it('stringifies a non-Error rejection reason', async () => {
    await install();

    window.dispatchEvent(rejectionEvent('plain string'));

    expect(umamiTrack).toHaveBeenCalledWith('js_error', {
      message: 'plain string',
      source: 'unhandledrejection',
    });
  });

  it('truncates long messages to 200 characters', async () => {
    await install();

    window.dispatchEvent(new ErrorEvent('error', { message: 'a'.repeat(500), filename: 'x.js', lineno: 2 }));

    const [, props] = umamiTrack.mock.calls[0] as [string, { message: string }];
    expect(props.message).toHaveLength(200);
  });

  it('falls back to "unknown" when the event has no message or filename', async () => {
    await install();

    window.dispatchEvent(new ErrorEvent('error'));

    expect(umamiTrack).toHaveBeenCalledWith('js_error', { message: 'unknown', source: 'unknown:0' });
  });

  it('stops tracking after the returned cleanup runs', async () => {
    await install();
    uninstall?.();
    uninstall = undefined;

    window.dispatchEvent(new ErrorEvent('error', { message: 'late', filename: 'x.js', lineno: 1 }));

    expect(umamiTrack).not.toHaveBeenCalled();
  });
});
