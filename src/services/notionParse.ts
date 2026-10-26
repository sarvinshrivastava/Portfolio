import type { About, Project, TimelineEvent, Experience } from '../types';

/**
 * Pure Notion-to-model parsers: no `import.meta`, DOM or analytics, so the
 * build-time snapshot (scripts/snapshot.ts, run from vite.config.ts) and the
 * browser (src/services/notion.ts) share one implementation.
 *
 * Bump `CV` in notion.ts whenever a parser changes the model shape.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NotionPage = { id: string; properties: Record<string, any> };

export function richText(blocks: { plain_text: string }[] | undefined): string {
  return blocks?.map(b => b.plain_text).join('') ?? '';
}

/**
 * Notion hands us URLs an editor typed, and one of them reaches `window.open`
 * in useKeyboardNav — which, unlike React's `href` handling, does NOT block
 * `javascript:`. Anything that is not plain http(s) is dropped at the source so
 * every consumer inherits the check.
 */
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? value : undefined;
  } catch {
    return undefined;
  }
}

export function parseAbout(results: NotionPage[]): About {
  const p = results[0]?.properties ?? {};
  return {
    bio: richText(p.Bio?.rich_text),
    github: safeUrl(p.GitHub?.url),
    linkedin: safeUrl(p.LinkedIn?.url),
    x: safeUrl(p.X?.url),
    medium: safeUrl(p.Medium?.url),
    email: p.Email?.email ?? undefined,
    roles: p['Roles']?.multi_select?.map((t: { name: string }) => t.name) ?? [],
    resumeUrl: safeUrl(p['Resume URL']?.url),
  };
}

export function parseProjects(results: NotionPage[]): Project[] {
  return results.map(page => {
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
}

/**
 * Returns the order MyJourney displays: the service used to reverse the rows
 * (Notion returns them ascending), then MyJourney sorted by `sortOrder`
 * ascending. `Array.prototype.sort` is stable, so ties keep the reversed order.
 */
export function parseTimeline(results: NotionPage[]): TimelineEvent[] {
  const data = results.map(page => {
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
  return data.reverse().sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Newest first, the order Experience displays. */
export function parseExperience(results: NotionPage[]): Experience[] {
  const data = results.map(page => {
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
  return data.sort((a, b) => b.startDate.localeCompare(a.startDate));
}
