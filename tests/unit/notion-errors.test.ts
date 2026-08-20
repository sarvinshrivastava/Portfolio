// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dataset } from '../../src/lib/analytics';

/**
 * `data_load_error` is the site's only signal that the Notion cache is dead:
 * every fetch failure degrades into an empty section that renders fine and
 * reports a perfectly healthy pageview. If these events stop firing, an outage
 * is invisible. So this file asserts the exact `{ dataset, status }` shape on
 * every failure path, not just "an error was thrown".
 *
 * Node environment on purpose — notion.ts touches no DOM beyond localStorage,
 * which is stubbed below.
 */

const analytics = vi.hoisted(() => ({
  track: vi.fn(),
  trackOnce: vi.fn(),
}));

vi.mock('../../src/lib/analytics', () => analytics);

/**
 * notion.ts currently calls `track`; a deduped `trackOnce(key, name, data)` is
 * being introduced. Normalising both into one list keeps these assertions
 * about the CONTRACT (which event, with which properties) rather than about
 * which helper happens to be wired up today.
 */
function events(): Array<[string, Record<string, unknown>]> {
  return [
    ...analytics.track.mock.calls.map(c => [c[0], c[1]] as [string, Record<string, unknown>]),
    ...analytics.trackOnce.mock.calls.map(
      c => [c[1], c[2]] as [string, Record<string, unknown>],
    ),
  ];
}

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

const DB_IDS: Record<Dataset, string> = {
  about: 'about-db-id',
  projects: 'projects-db-id',
  timeline: 'timeline-db-id',
  experience: 'experience-db-id',
};

const fetchMock = vi.fn();

/**
 * DB_MAP and CACHE_API are module-level consts read from `import.meta.env` at
 * import time, so stubbed env only takes effect on a FRESH module instance —
 * hence resetModules + dynamic import in every test rather than a top-level
 * static import.
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

beforeEach(() => {
  analytics.track.mockClear();
  analytics.trackOnce.mockClear();
  fetchMock.mockReset();
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports status -1 and rethrows the original error when the request never lands', async () => {
    const networkError = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValueOnce(networkError);

    const { fetchProjects } = await loadNotion();

    // The ORIGINAL error must propagate untouched — callers distinguish an
    // offline visitor from a broken cache by its type.
    await expect(fetchProjects()).rejects.toBe(networkError);

    expect(events()).toEqual([['data_load_error', { dataset: 'projects', status: -1 }]]);
  });

  it('reports the HTTP status and throws on a 503 from the cache', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const { fetchTimeline } = await loadNotion();

    await expect(fetchTimeline()).rejects.toThrow(/Notion cache query failed: 503/);

    expect(events()).toEqual([['data_load_error', { dataset: 'timeline', status: 503 }]]);
  });

  it('emits nothing and never refetches when a warm cache satisfies the read', async () => {
    const { fetchAbout } = await loadNotion();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ id: 'p1', properties: { Bio: { rich_text: [{ plain_text: 'hi' }] } } }],
      }),
    });

    const first = await fetchAbout();
    expect(first.bio).toBe('hi');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await fetchAbout();
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1); // served from localStorage
    expect(events()).toEqual([]);
  });
});
