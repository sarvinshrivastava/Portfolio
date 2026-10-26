// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dataset } from '../../src/lib/analytics';
import {
  DB_IDS,
  apiCalls,
  bundleJson,
  json,
  makeLocalStorage,
  router,
  snapshotBody,
  type Handler,
} from '../support/notionHarness';

const analytics = vi.hoisted(() => ({ track: vi.fn(), trackOnce: vi.fn() }));
vi.mock('../../src/lib/analytics', () => analytics);

const fetchMock = vi.fn();
let storage: ReturnType<typeof makeLocalStorage>;

/** The memo, `lastFailure` and the snapshot memo are module state, so every test re-imports. */
async function loadNotion() {
  vi.stubEnv('VITE_NOTION_CACHE_URL', '');
  for (const [k, id] of Object.entries(DB_IDS)) vi.stubEnv(`VITE_NOTION_DB_${k.toUpperCase()}`, id);
  vi.resetModules();
  return import('../../src/services/notion');
}

const route = (over: Partial<Record<Dataset | 'snapshot', Handler>> = {}) =>
  fetchMock.mockImplementation(router(over));

const events = () => analytics.trackOnce.mock.calls.map(c => [c[1], c[2]]);
const fallbackEvents = () => events().filter(e => e[0] === 'data_fallback_served');
const seed = (ts: number, tag = 'stale', cv = 1) =>
  storage.setItem('notion_bundle', bundleJson(ts, tag, cv));
const status =
  (n: number): Handler =>
  () =>
    json('', n);

beforeEach(() => {
  analytics.track.mockClear();
  analytics.trackOnce.mockClear();
  fetchMock.mockReset();
  storage = makeLocalStorage();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('group commit with saved-data fallback', () => {
  it('serves a fresh bundle without any fetch', async () => {
    seed(Date.now(), 'fresh');
    route();
    const { fetchAbout } = await loadNotion();

    expect((await fetchAbout()).bio).toBe('fresh');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('replaces a stale bundle with 4 OK fetches and emits no fallback event', async () => {
    seed(Date.now() - 10 * 60_000);
    route();
    const { fetchAbout, fetchProjects } = await loadNotion();

    expect((await fetchAbout()).bio).toBe('hello');
    expect((await fetchProjects())[0].title).toBe('Proj');
    expect(apiCalls(fetchMock)).toHaveLength(4);
    expect(fallbackEvents()).toEqual([]);
    expect(JSON.parse(storage.getItem('notion_bundle') as string).about.bio).toBe('hello');
  });

  it('serves the stale bundle for all 4 when one dataset is rate limited', async () => {
    seed(Date.now() - 10 * 60_000);
    route({ timeline: status(429) });
    const { fetchAbout, fetchProjects } = await loadNotion();
    const seen: unknown[] = [];
    window.addEventListener('notion:fallback', e => seen.push((e as CustomEvent).detail));

    // No mixing: about and projects came back OK live, but the stale set wins for all.
    expect((await fetchAbout()).bio).toBe('stale');
    expect((await fetchProjects())[0].title).toBe('stale');
    expect(fallbackEvents()).toEqual([
      ['data_fallback_served', { reason: 'rate_limited', source: 'local' }],
    ]);
    expect(seen).toHaveLength(1);
  });

  it('falls back to the snapshot on a 500 with no bundle', async () => {
    route({
      projects: status(500),
      snapshot: () => json(snapshotBody(new Date().toISOString())),
    });
    const { fetchAbout, getLastFallback } = await loadNotion();

    expect((await fetchAbout()).bio).toBe('snap');
    expect(fallbackEvents()).toEqual([
      ['data_fallback_served', { reason: 'unavailable', source: 'snapshot' }],
    ]);
    expect(getLastFallback()?.reason).toBe('unavailable');
  });

  it('prefers the newer of snapshot and local, and a tie goes to local', async () => {
    const T = Date.parse('2026-10-20T10:00:00.000Z');
    const run = async (snapTs: number) => {
      vi.resetModules();
      analytics.trackOnce.mockClear();
      seed(T);
      route({
        about: status(500),
        snapshot: () => json(snapshotBody(new Date(snapTs).toISOString())),
      });
      const { fetchAbout } = await loadNotion();
      return (await fetchAbout()).bio;
    };

    expect(await run(T + 1000)).toBe('snap');
    expect(await run(T)).toBe('stale');
    expect(await run(T - 1000)).toBe('stale');
  });

  it('rejects when neither a bundle nor a snapshot exists', async () => {
    route({ about: status(500) });
    const { fetchAbout } = await loadNotion();

    await expect(fetchAbout()).rejects.toThrow(/500/);
    expect(fallbackEvents()).toEqual([]);
  });

  it('reports -2 for a 200 {} and then falls back', async () => {
    seed(Date.now() - 10 * 60_000);
    route({ projects: () => json({}) });
    const { fetchProjects } = await loadNotion();

    expect((await fetchProjects())[0].title).toBe('stale');
    expect(events()).toContainEqual(['data_load_error', { dataset: 'projects', status: -2 }]);
  });

  it('makes a single set of 4 fetches for two concurrent calls', async () => {
    route();
    const { fetchAbout } = await loadNotion();

    await Promise.all([fetchAbout(), fetchAbout()]);
    expect(apiCalls(fetchMock)).toHaveLength(4);
  });

  it('keeps the fallback for the whole page load, even after 61 s', async () => {
    vi.useFakeTimers();
    seed(Date.now() - 10 * 60_000);
    route({ timeline: status(429) });
    const { fetchAbout, fetchProjects } = await loadNotion();

    const about = await fetchAbout();
    const calls = apiCalls(fetchMock).length;
    await vi.advanceTimersByTimeAsync(61_000);
    const projects = await fetchProjects();

    expect(apiCalls(fetchMock)).toHaveLength(calls);
    expect(about.bio).toBe('stale');
    expect(projects[0].title).toBe('stale');
  });

  it('blocks live retries for 60 s after a rejection, without sliding the window', async () => {
    vi.useFakeTimers();
    route({ about: status(500) });
    const { fetchAbout } = await loadNotion();

    const first = await fetchAbout().catch(e => e);
    expect(first).toBeInstanceOf(Error);
    expect(apiCalls(fetchMock)).toHaveLength(4);

    const second = await fetchAbout().catch(e => e);
    expect(second).toBe(first);
    expect(apiCalls(fetchMock)).toHaveLength(4);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(await fetchAbout().catch(e => e)).toBe(first);
    expect(apiCalls(fetchMock)).toHaveLength(4);

    // 61 s after the real attempt, not after the last blocked call.
    await vi.advanceTimersByTimeAsync(31_000);
    await fetchAbout().catch(e => e);
    expect(apiCalls(fetchMock)).toHaveLength(8);
  });

  it('falls back after 8 s when one fetch hangs', async () => {
    vi.useFakeTimers();
    seed(Date.now() - 10 * 60_000);
    const hang: Handler = init =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    route({ experience: hang });
    const { fetchAbout } = await loadNotion();

    const pending = fetchAbout();
    await vi.advanceTimersByTimeAsync(8000);

    expect((await pending).bio).toBe('stale');
    expect(events()).toContainEqual(['data_load_error', { dataset: 'experience', status: -1 }]);
  });

  it('does not treat a bundle from the future as fresh, but can still fall back to it', async () => {
    seed(Date.now() + 3_600_000, 'future');
    route({ about: status(500) });
    const { fetchAbout } = await loadNotion();

    expect((await fetchAbout()).bio).toBe('future');
    expect(apiCalls(fetchMock)).toHaveLength(4);
  });

  it('ignores a bundle with cv 2', async () => {
    seed(Date.now(), 'v2', 2);
    route({ about: status(500) });
    const { fetchAbout } = await loadNotion();

    await expect(fetchAbout()).rejects.toThrow();
    expect(apiCalls(fetchMock)).toHaveLength(4);
  });

  it('deletes the legacy per-dataset keys on load', async () => {
    for (const k of ['about', 'projects', 'timeline', 'experience']) {
      storage.setItem(`notion_${k}`, '{}');
    }
    route();
    await loadNotion();

    for (const k of ['about', 'projects', 'timeline', 'experience']) {
      expect(storage.getItem(`notion_${k}`)).toBeNull();
    }
  });

  it('ignores a snapshot answered as text/html (the SPA rewrite)', async () => {
    route({
      about: status(500),
      snapshot: () => json('<!doctype html>', 200, 'text/html'),
    });
    const { fetchAbout } = await loadNotion();

    await expect(fetchAbout()).rejects.toThrow();
  });

  it.each([
    ['about: null', { about: null }],
    ['projects: "x"', { projects: 'x' }],
    ['timeline: {}', { timeline: {} }],
    ['experience: "x"', { experience: 'x' }],
    ['projects: [null]', { projects: [null] }],
    ['timeline: [null]', { timeline: [null] }],
    ['experience: [[]]', { experience: [[]] }],
  ])('ignores a saved bundle with %s', async (_label, patch) => {
    storage.setItem(
      'notion_bundle',
      JSON.stringify({ ...JSON.parse(bundleJson(Date.now() - 10 * 60_000)), ...patch }),
    );
    route({ about: status(500) });
    const { fetchAbout } = await loadNotion();

    await expect(fetchAbout()).rejects.toThrow();
  });

  it('ignores a snapshot whose about is null', async () => {
    route({
      about: status(500),
      snapshot: () => json({ ...snapshotBody(new Date().toISOString()), about: null }),
    });
    const { fetchAbout } = await loadNotion();

    await expect(fetchAbout()).rejects.toThrow();
  });

  it('drops javascript: urls from the snapshot too', async () => {
    const snap = snapshotBody(new Date().toISOString());
    snap.about.github = 'javascript:alert(1)';
    snap.projects[0].githubUrl = 'javascript:alert(2)';
    route({ about: status(500), snapshot: () => json(snap) });
    const { fetchAbout, fetchProjects } = await loadNotion();

    expect((await fetchAbout()).github).toBeUndefined();
    expect((await fetchProjects())[0].githubUrl).toBeUndefined();
  });

  it('drops a javascript: url from saved data', async () => {
    const saved = JSON.parse(bundleJson(Date.now() - 10 * 60_000));
    saved.about.github = 'javascript:alert(1)';
    saved.projects[0].githubUrl = 'javascript:alert(2)';
    storage.setItem('notion_bundle', JSON.stringify(saved));
    route({ about: status(500) });
    const { fetchAbout, fetchProjects } = await loadNotion();

    expect((await fetchAbout()).github).toBeUndefined();
    expect((await fetchProjects())[0].githubUrl).toBeUndefined();
  });

  it('exposes setLastFallback through getLastFallback', async () => {
    const { getLastFallback, setLastFallback } = await loadNotion();

    expect(getLastFallback()).toBeNull();
    setLastFallback({ reason: 'unavailable', savedAt: 5 });
    expect(getLastFallback()).toEqual({ reason: 'unavailable', savedAt: 5 });
  });
});
