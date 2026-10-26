// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { fetchSnapshot } from '../../scripts/snapshot';
import {
  aboutPages,
  experiencePages,
  projectPages,
  timelinePages,
} from '../support/notionFixtures';

const mkSleep = () => vi.fn<(ms: number) => Promise<void>>(async () => {});
const ids = { about: 'ida', projects: 'idp', timeline: 'idt', experience: 'ide' };
const base = 'https://cache.test';

type Results = Record<string, unknown>;
const ok = (results: unknown, extra: Results = {}) =>
  new Response(JSON.stringify({ results, ...extra }), { status: 200 });

function routes(over: Record<string, () => Response | Promise<Response>> = {}) {
  const table: Record<string, () => Response | Promise<Response>> = {
    ida: () => ok(aboutPages()),
    idp: () => ok(projectPages),
    idt: () => ok(timelinePages),
    ide: () => ok(experiencePages),
    ...over,
  };
  return vi.fn(async (url: string | URL | Request) => {
    const id = String(url).split('/').pop() as string;
    return table[id]();
  }) as unknown as typeof fetch;
}

const run = (fetchImpl: typeof fetch, sleep = mkSleep(), b = base) =>
  fetchSnapshot({ base: b, ids, fetchImpl, sleep });

describe('fetchSnapshot', () => {
  it('returns the shape, with no phone key at any depth', async () => {
    const s = await run(routes());
    expect(s.v).toBe(1);
    expect(Number.isFinite(Date.parse(s.generatedAt))).toBe(true);
    expect(s.about.bio).toBe('hello');
    expect(s.projects).toHaveLength(1);
    expect(s.timeline).toHaveLength(4);
    expect(s.experience).toHaveLength(2);
    expect(JSON.stringify(s).toLowerCase()).not.toContain('phone');
  });

  it('retries a 429 then succeeds, sleeping 5000 first', async () => {
    let n = 0;
    const sleep = mkSleep();
    const s = await run(
      routes({ idp: () => (n++ === 0 ? new Response('', { status: 429 }) : ok(projectPages)) }),
      sleep,
    );
    expect(s.projects).toHaveLength(1);
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it('throws after three 500s, naming the dataset', async () => {
    const sleep = mkSleep();
    await expect(
      run(routes({ idt: () => new Response('', { status: 500 }) }), sleep),
    ).rejects.toThrow('snapshot: timeline failed (500)');
    expect(sleep.mock.calls.map(c => c[0])).toEqual([5000, 15000]);
  });

  it('survives a network error followed by a 200', async () => {
    let n = 0;
    const s = await run(
      routes({
        ide: () => {
          if (n++ === 0) throw new TypeError('fetch failed');
          return ok(experiencePages);
        },
      }),
    );
    expect(s.experience).toHaveLength(2);
  });

  it('does not retry a 404', async () => {
    const sleep = mkSleep();
    await expect(
      run(routes({ idp: () => new Response('', { status: 404 }) }), sleep),
    ).rejects.toThrow('snapshot: projects failed (404)');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('accepts two About rows', async () => {
    const two = [...aboutPages(), ...aboutPages('second')];
    const s = await run(routes({ ida: () => ok(two) }));
    expect(s.about.bio).toBe('hello');
  });

  it('throws on a non-array results', async () => {
    await expect(run(routes({ idp: () => ok({}) }))).rejects.toThrow(/projects/);
  });

  it('throws on an empty dataset', async () => {
    await expect(run(routes({ idt: () => ok([]) }))).rejects.toThrow(/timeline/);
  });

  it('throws when About has an empty Bio', async () => {
    await expect(run(routes({ ida: () => ok(aboutPages('')) }))).rejects.toThrow(/about/);
  });

  it('percent-encodes the database id in the request URL', async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return ok(String(url).includes('a%2Fb%3Fc') ? aboutPages() : projectPages);
    }) as unknown as typeof fetch;
    await fetchSnapshot({
      base,
      ids: { ...ids, about: 'a/b?c' },
      fetchImpl,
      sleep: mkSleep(),
      retries: [],
    }).catch(() => {});

    expect(urls).toContain(`${base}/api/database/a%2Fb%3Fc`);
  });

  it('throws on a relative base', async () => {
    await expect(run(routes(), undefined, '/api')).rejects.toThrow(
      'snapshot: VITE_NOTION_CACHE_URL must be absolute',
    );
  });
});
