import {
  parseAbout,
  parseProjects,
  parseTimeline,
  parseExperience,
  type NotionPage,
} from '../src/services/notionParse';
import type { About, Dataset, Project, TimelineEvent, Experience } from '../src/types';

/**
 * Build-time copy of the four Notion datasets, written to dist/data/snapshot.json
 * by the `snapshot()` plugin in vite.config.ts. The site falls back to it when
 * the live notion-cache is unreachable or rate-limited (src/services/notion.ts).
 *
 * Kept outside src/ because the plugin runs in node. The parsers are shared with
 * the browser, so the snapshot has exactly the shape the site renders.
 */

export interface Snapshot {
  v: 1;
  generatedAt: string;
  about: About;
  projects: Project[];
  timeline: TimelineEvent[];
  experience: Experience[];
}

export interface FetchSnapshotOptions {
  base: string;
  ids: Record<Dataset, string>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<unknown>;
  retries?: number[];
}

const DATASETS: Dataset[] = ['about', 'projects', 'timeline', 'experience'];

async function fetchResults(
  dataset: Dataset,
  url: string,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<unknown>,
  retries: number[],
): Promise<NotionPage[]> {
  for (let attempt = 0; ; attempt++) {
    let status: number | string;
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
      status = res.status;
      if (res.ok) {
        const body = await res.json();
        if (!Array.isArray(body?.results)) {
          throw new Error(`snapshot: ${dataset} response has no results array`);
        }
        if (body._stale === true) console.warn(`snapshot: ${dataset} was served stale by the cache`);
        return body.results;
      }
      // Only rate limits and server errors are worth retrying.
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`snapshot: ${dataset} failed (${res.status})`);
      }
    } catch (err) {
      // Our own errors are final; anything else is a network error or timeout.
      if (err instanceof Error && err.message.startsWith('snapshot:')) throw err;
      status = 'network error';
    }
    if (attempt >= retries.length) throw new Error(`snapshot: ${dataset} failed (${status})`);
    await sleep(retries[attempt]);
  }
}

export async function fetchSnapshot({
  base,
  ids,
  fetchImpl = fetch,
  sleep = ms => new Promise(r => setTimeout(r, ms)),
  retries = [5000, 15000],
}: FetchSnapshotOptions): Promise<Snapshot> {
  if (!/^https?:\/\//.test(base)) {
    throw new Error('snapshot: VITE_NOTION_CACHE_URL must be absolute');
  }

  const [about, projects, timeline, experience] = await Promise.all(
    DATASETS.map(d => fetchResults(d, `${base}/api/database/${ids[d]}`, fetchImpl, sleep, retries)),
  );

  const snapshot: Snapshot = {
    v: 1,
    generatedAt: new Date().toISOString(),
    about: parseAbout(about),
    projects: parseProjects(projects),
    timeline: parseTimeline(timeline),
    experience: parseExperience(experience),
  };

  // The site reads only the first About row, and an empty list renders as an
  // empty section, so either would ship a snapshot that is worse than none.
  if (about.length < 1 || !snapshot.about.bio) {
    throw new Error('snapshot: about is empty or its first row has no Bio');
  }
  for (const d of ['projects', 'timeline', 'experience'] as const) {
    if (snapshot[d].length === 0) throw new Error(`snapshot: ${d} is empty`);
  }
  return snapshot;
}
