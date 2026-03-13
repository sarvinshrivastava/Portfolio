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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionPage = { id: string; properties: Record<string, any> };

async function notionQuery(dbId: string, sort = true): Promise<{ results: NotionPage[] }> {
  // Routed through /api/notion proxy (Vite dev) or Vercel function (prod)
  // to avoid CORS — browser cannot call api.notion.com directly
  const body = sort
    ? { sorts: [{ property: 'Sort Order', direction: 'ascending' }] }
    : {};
  const res = await fetch(`/api/notion/databases/${dbId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion query failed: ${res.status}`);
  return res.json();
}

// ── About ──────────────────────────────────────────────────────────────────
export async function fetchAbout(): Promise<About> {
  const cached = getCache<About>('notion_about');
  if (cached) return cached;

  const dbId = import.meta.env.VITE_NOTION_DB_ABOUT;
  const { results } = await notionQuery(dbId, false);
  const p = results[0]?.properties ?? {};

  const data: About = {
    bio: richText(p.Bio?.rich_text),
    github: p.GitHub?.url ?? undefined,
    linkedin: p.LinkedIn?.url ?? undefined,
    x: p.X?.url ?? undefined,
    medium: p.Medium?.url ?? undefined,
    email: p.Email?.email ?? undefined,
    roles: p['Roles']?.multi_select?.map((t: { name: string }) => t.name) ?? [],
    resumeUrl: p['Resume URL']?.url ?? undefined,
  };

  setCache('notion_about', data);
  return data;
}

// ── Projects ───────────────────────────────────────────────────────────────
export async function fetchProjects(): Promise<Project[]> {
  const cached = getCache<Project[]>('notion_projects');
  if (cached) return cached;

  const dbId = import.meta.env.VITE_NOTION_DB_PROJECTS;
  const { results } = await notionQuery(dbId);

  const data: Project[] = results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      title: richText(p.Name?.title),
      description: richText(p.Description?.rich_text),
      category: p.Category?.select?.name ?? 'Tools',
      techStack: p['Tech Stack']?.multi_select?.map((t: { name: string }) => t.name) ?? [],
      githubUrl: p['GitHub URL']?.url ?? undefined,
      imageUrl: p['Image URL']?.url ?? undefined,
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

  const dbId = import.meta.env.VITE_NOTION_DB_TIMELINE;
  const { results } = await notionQuery(dbId);

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

  const dbId = import.meta.env.VITE_NOTION_DB_EXPERIENCE;
  const { results } = await notionQuery(dbId);

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
