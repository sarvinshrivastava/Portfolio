import type { Dataset } from '../../src/lib/analytics';
import {
  parseAbout,
  parseExperience,
  parseProjects,
  parseTimeline,
} from '../../src/services/notionParse';
import { aboutPages, experiencePages, projectPages, timelinePages } from './notionFixtures';

export const DB_IDS: Record<Dataset, string> = {
  about: 'about-db-id',
  projects: 'projects-db-id',
  timeline: 'timeline-db-id',
  experience: 'experience-db-id',
};

export function makeLocalStorage() {
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

export const json = (body: unknown, status = 200, contentType = 'application/json') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType },
  });

const RESULTS: Record<Dataset, unknown> = {
  about: aboutPages(),
  projects: projectPages,
  timeline: timelinePages,
  experience: experiencePages,
};

/** The model a bundle or snapshot carries, with `tag` as the Bio and a project title. */
export function siteData(tag: string) {
  return {
    about: parseAbout(aboutPages(tag)),
    projects: parseProjects(projectPages).map(p => ({ ...p, title: tag })),
    timeline: parseTimeline(timelinePages),
    experience: parseExperience(experiencePages),
  };
}

export const bundleJson = (ts: number, tag = 'stale', cv = 1) =>
  JSON.stringify({ cv, ts, ...siteData(tag) });

export const snapshotBody = (generatedAt: string, tag = 'snap') => ({
  v: 1,
  generatedAt,
  ...siteData(tag),
});

export type Handler = (init?: RequestInit) => Response | Promise<Response>;

/**
 * Routes fetch by URL: each dataset answers its OK fixture unless overridden,
 * and `/data/snapshot.json` answers 404 unless overridden.
 */
export function router(over: Partial<Record<Dataset | 'snapshot', Handler>> = {}) {
  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = String(url);
    if (u.includes('/data/snapshot.json')) {
      return (over.snapshot ?? (() => json('', 404)))(init);
    }
    for (const d of Object.keys(DB_IDS) as Dataset[]) {
      if (u.includes(`/api/database/${DB_IDS[d]}`)) {
        return (over[d] ?? (() => json({ results: RESULTS[d] })))(init);
      }
    }
    throw new Error(`unrouted fetch: ${u}`);
  };
}

export const apiCalls = (fetchMock: { mock: { calls: unknown[][] } }) =>
  fetchMock.mock.calls.filter(c => String(c[0]).includes('/api/database/'));
