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
  type Handler,
} from '../support/notionHarness';

/**
 * `data_load_error` is the site's only signal that the Notion cache is dead:
 * every fetch failure degrades into an empty section that renders fine and
 * reports a perfectly healthy pageview. If these events stop firing, an outage
 * is invisible. So this file asserts the exact `{ dataset, status }` shape on
 * every failure path, not just "an error was thrown".
 *
 * Data loads as a group: one dataset under test fails, the other three answer
 * OK, and `/data/snapshot.json` answers 404, so there is no fallback candidate
 * and the call rejects with the original error. jsdom, because a fallback
 * would dispatch a window event.
 */

const analytics = vi.hoisted(() => ({
  track: vi.fn(),
  trackOnce: vi.fn(),
}));

vi.mock('../../src/lib/analytics', () => analytics);

/** Normalises `track` and `trackOnce(key, name, data)` into one list of [name, data]. */
function events(): Array<[string, Record<string, unknown>]> {
  return [
    ...analytics.track.mock.calls.map(c => [c[0], c[1]] as [string, Record<string, unknown>]),
    ...analytics.trackOnce.mock.calls.map(
      c => [c[1], c[2]] as [string, Record<string, unknown>],
    ),
  ];
}

const fetchMock = vi.fn();

/**
 * DB_MAP and CACHE_API are module-level consts read from `import.meta.env` at
 * import time, so stubbed env only takes effect on a FRESH module instance.
 */
async function loadNotion(overrides: Partial<Record<Dataset, string>> = {}) {
  vi.stubEnv('VITE_NOTION_CACHE_URL', '');
  for (const key of Object.keys(DB_IDS) as Dataset[]) {
    const value = key in overrides ? (overrides[key] as string) : DB_IDS[key];
    vi.stubEnv(`VITE_NOTION_DB_${key.toUpperCase()}`, value);
  }
  vi.resetModules();
  return import('../../src/services/notion');
}

const failing = (dataset: Dataset, handler: Handler) =>
  fetchMock.mockImplementation(router({ [dataset]: handler }));

beforeEach(() => {
  analytics.track.mockClear();
  analytics.trackOnce.mockClear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(router());
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('localStorage', makeLocalStorage());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('notionQuery failure reporting', () => {
  it('reports status 0 and rejects when the database id is missing from the build', async () => {
    const { fetchAbout } = await loadNotion({ about: '' });

    await expect(fetchAbout()).rejects.toThrow(/VITE_NOTION_DB_ABOUT is not set/);

    expect(events()).toEqual([['data_load_error', { dataset: 'about', status: 0 }]]);
    // The missing dataset makes no /api call; the other three do.
    expect(apiCalls(fetchMock)).toHaveLength(3);
  });

  it('reports status -1 and rethrows the same error object when the request never lands', async () => {
    const networkError = new TypeError('Failed to fetch');
    failing('projects', () => Promise.reject(networkError));

    const { fetchProjects } = await loadNotion();

    // The ORIGINAL error object must propagate — callers distinguish an
    // offline visitor from a broken cache by its type.
    await expect(fetchProjects()).rejects.toBe(networkError);

    expect(events()).toEqual([['data_load_error', { dataset: 'projects', status: -1 }]]);
  });

  it('reports the HTTP status and throws on a 503 from the cache', async () => {
    failing('timeline', () => json('', 503));

    const { fetchTimeline } = await loadNotion();

    await expect(fetchTimeline()).rejects.toThrow(/Notion cache query failed: 503/);

    expect(events()).toEqual([['data_load_error', { dataset: 'timeline', status: 503 }]]);
  });

  it('reports -2 when the cache answers 200 with a body that has no results', async () => {
    failing('experience', () => json({}));

    const { fetchExperience } = await loadNotion();

    await expect(fetchExperience()).rejects.toThrow();

    expect(events()).toEqual([['data_load_error', { dataset: 'experience', status: -2 }]]);
  });

  it('emits nothing and never refetches when a warm cache satisfies the read', async () => {
    localStorage.setItem('notion_bundle', bundleJson(Date.now(), 'warm'));
    const { fetchAbout } = await loadNotion();

    expect((await fetchAbout()).bio).toBe('warm');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(events()).toEqual([]);
  });
});
