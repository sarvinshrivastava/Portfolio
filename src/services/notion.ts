import { trackOnce, type Dataset } from '../lib/analytics';
import type { About, Project, TimelineEvent, Experience } from '../types';

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

function richText(blocks: { plain_text: string }[] | undefined): string {
  return blocks?.map(b => b.plain_text).join('') ?? '';
}

const CACHE_API = import.meta.env.VITE_NOTION_CACHE_URL ?? '';

const DB_MAP: Record<Dataset, string> = {
  about: import.meta.env.VITE_NOTION_DB_ABOUT ?? '',
  projects: import.meta.env.VITE_NOTION_DB_PROJECTS ?? '',
  timeline: import.meta.env.VITE_NOTION_DB_TIMELINE ?? '',
  experience: import.meta.env.VITE_NOTION_DB_EXPERIENCE ?? '',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionPage = { id: string; properties: Record<string, any> };

/**
 * Notion hands us URLs an editor typed, and one of them reaches `window.open`
 * in useKeyboardNav — which, unlike React's `href` handling, does NOT block
 * `javascript:`. Anything that is not plain http(s) is dropped at the source so
 * every consumer inherits the check.
 */
function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? value : undefined;
  } catch {
    return undefined;
  }
}

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

  const { results } = await notionQuery('about');
  const p = results[0]?.properties ?? {};

  const data: About = {
    bio: richText(p.Bio?.rich_text),
    github: safeUrl(p.GitHub?.url),
    linkedin: safeUrl(p.LinkedIn?.url),
    x: safeUrl(p.X?.url),
    medium: safeUrl(p.Medium?.url),
    email: p.Email?.email ?? undefined,
    roles: p['Roles']?.multi_select?.map((t: { name: string }) => t.name) ?? [],
    resumeUrl: safeUrl(p['Resume URL']?.url),
  };

  setCache('notion_about', data);
  return data;
}

// ── Projects ───────────────────────────────────────────────────────────────
export async function fetchProjects(): Promise<Project[]> {
  const cached = getCache<Project[]>('notion_projects');
  if (cached) return cached;

  const { results } = await notionQuery('projects');

  const data: Project[] = results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      title: richText(p.Name?.title),
      description: richText(p.Description?.rich_text),
      category: p.Category?.select?.name ?? 'Tools',
      techStack: p['Tech Stack']?.multi_select?.map((t: { name: string }) => t.name) ?? [],
      githubUrl: safeUrl(p['GitHub URL']?.url),
      imageUrl: safeUrl(p['Image URL']?.url),
      date: p.Date?.date?.start ?? undefined,
      featured: p.Featured?.checkbox ?? false,
      sortOrder: p['Sort Order']?.number ?? 0,
    } satisfies Project;
  });

  setCache('notion_projects', data);
  return data;
}

// ── Timeline ───────────────────────────────────────────────────────────────
export async function fetchTimeline(): Promise<TimelineEvent[]> {
  const cached = getCache<TimelineEvent[]>('notion_timeline');
  if (cached) return cached;

  const { results } = await notionQuery('timeline');

  const data: TimelineEvent[] = results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      title: richText(p.Name?.title),
      description: richText(p.Description?.rich_text),
      date: richText(p['Date Range']?.rich_text),
      category: p.Category?.select?.name ?? 'Milestone',
      sortOrder: p['Sort Order']?.number ?? 0,
    } satisfies TimelineEvent;
  });

  data.reverse(); // Notion returns ascending Sort Order → reverse = newest first
  setCache('notion_timeline', data);
  return data;
}

// ── Experience ─────────────────────────────────────────────────────────────
export async function fetchExperience(): Promise<Experience[]> {
  const cached = getCache<Experience[]>('notion_experience');
  if (cached) return cached;

  const { results } = await notionQuery('experience');

  const data: Experience[] = results.map(page => {
    const p = page.properties;
    const rawDesc = richText(p.Description?.rich_text);
    return {
      id: page.id,
      company: richText(p.Name?.title),
      role: richText(p.Role?.rich_text),
      startDate: p['Start Date']?.date?.start ?? '',
      endDate: p['End Date']?.date?.start ?? undefined,
      location: richText(p.Location?.rich_text),
      description: rawDesc.split('\n').filter(Boolean),
      techStack: p['Tech Stack']?.multi_select?.map((t: { name: string }) => t.name) ?? [],
      sortOrder: p['Sort Order']?.number ?? 0,
    } satisfies Experience;
  });

  data.sort((a, b) => b.startDate.localeCompare(a.startDate));
  setCache('notion_experience', data);
  return data;
}
