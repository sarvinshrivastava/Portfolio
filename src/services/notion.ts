import { trackOnce, type Dataset } from '../lib/analytics';
import type { About, Project, TimelineEvent, Experience } from '../types';
import {
  parseAbout,
  parseProjects,
  parseTimeline,
  parseExperience,
  type NotionPage,
} from './notionParse';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const { data, ts } = JSON.parse(item);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage unavailable — ignore
  }
}

const CACHE_API = import.meta.env.VITE_NOTION_CACHE_URL ?? '';

const DB_MAP: Record<Dataset, string> = {
  about: import.meta.env.VITE_NOTION_DB_ABOUT ?? '',
  projects: import.meta.env.VITE_NOTION_DB_PROJECTS ?? '',
  timeline: import.meta.env.VITE_NOTION_DB_TIMELINE ?? '',
  experience: import.meta.env.VITE_NOTION_DB_EXPERIENCE ?? '',
};

/**
 * Every failure here reports `data_load_error` before throwing — a dead Notion
 * cache renders as a silently empty site, which no pageview count would reveal.
 * Synthetic statuses distinguish the non-HTTP failures: 0 = the DB id is
 * missing from the build, -1 = the request never reached the cache (offline,
 * DNS, CORS), -2 = the cache answered 200 with a body that is not JSON.
 *
 * Deduped per dataset: with the cache down, one visitor touring four routes
 * would otherwise emit an event per route and again after every cache lapse.
 */
async function notionQuery(page: Dataset): Promise<{ results: NotionPage[] }> {
  const reportKey = `data_load_error:${page}`;
  const dbId = DB_MAP[page];
  if (!dbId) {
    trackOnce(reportKey, 'data_load_error', { dataset: page, status: 0 });
    throw new Error(
      `VITE_NOTION_DB_${page.toUpperCase()} is not set — add it to your .env and Netlify environment variables`,
    );
  }

  let res: Response;
  try {
    res = await fetch(`${CACHE_API}/api/database/${dbId}`);
  } catch (err) {
    trackOnce(reportKey, 'data_load_error', { dataset: page, status: -1 });
    throw err;
  }

  if (!res.ok) {
    trackOnce(reportKey, 'data_load_error', { dataset: page, status: res.status });
    throw new Error(`Notion cache query failed: ${res.status}`);
  }

  try {
    return await res.json();
  } catch (err) {
    trackOnce(reportKey, 'data_load_error', { dataset: page, status: -2 });
    throw err;
  }
}

// ── About ──────────────────────────────────────────────────────────────────
export async function fetchAbout(): Promise<About> {
  const cached = getCache<About>('notion_about');
  if (cached) return cached;

  const data = parseAbout((await notionQuery('about')).results);
  setCache('notion_about', data);
  return data;
}

// ── Projects ───────────────────────────────────────────────────────────────
export async function fetchProjects(): Promise<Project[]> {
  const cached = getCache<Project[]>('notion_projects');
  if (cached) return cached;

  const data = parseProjects((await notionQuery('projects')).results);
  setCache('notion_projects', data);
  return data;
}

// ── Timeline ───────────────────────────────────────────────────────────────
export async function fetchTimeline(): Promise<TimelineEvent[]> {
  const cached = getCache<TimelineEvent[]>('notion_timeline');
  if (cached) return cached;

  const data = parseTimeline((await notionQuery('timeline')).results);
  setCache('notion_timeline', data);
  return data;
}

// ── Experience ─────────────────────────────────────────────────────────────
export async function fetchExperience(): Promise<Experience[]> {
  const cached = getCache<Experience[]>('notion_experience');
  if (cached) return cached;

  const data = parseExperience((await notionQuery('experience')).results);
  setCache('notion_experience', data);
  return data;
}
