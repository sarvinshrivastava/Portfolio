import { trackOnce, type Dataset } from '../lib/analytics';
import type { About, Project, TimelineEvent, Experience } from '../types';
import {
  parseAbout,
  parseProjects,
  parseTimeline,
  parseExperience,
  sanitizeSaved,
  type NotionPage,
} from './notionParse';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BUNDLE_KEY = 'notion_bundle';
/** Bump whenever a parser in notionParse.ts changes the model shape. */
const CV = 1;
const LEGACY_KEYS = ['notion_about', 'notion_projects', 'notion_timeline', 'notion_experience'];
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_AFTER_FAILURE_MS = 60_000;

interface SiteData {
  about: About;
  projects: Project[];
  timeline: TimelineEvent[];
  experience: Experience[];
}

interface Bundle extends SiteData {
  cv: number;
  ts: number;
}

type FallbackReason = 'rate_limited' | 'unavailable';
type FallbackSource = 'local' | 'snapshot';

export interface FallbackInfo {
  reason: FallbackReason;
  savedAt: number;
}

try {
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
} catch {
  // storage blocked — nothing to clean
}

function readBundle(): Bundle | null {
  try {
    const raw = localStorage.getItem(BUNDLE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (!b || b.cv !== CV || !Number.isFinite(b.ts)) return null;
    const data = sanitizeSaved(b);
    return data && { cv: b.cv, ts: b.ts, ...data };
  } catch {
    return null;
  }
}

function writeBundle(data: SiteData, ts: number) {
  try {
    localStorage.setItem(BUNDLE_KEY, JSON.stringify({ cv: CV, ts, ...data }));
  } catch {
    // storage full or blocked — ignore
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
 * DNS, CORS, timeout), -2 = the cache answered 200 with a body that is not JSON
 * or has no `results` array. Every thrown error carries the same `status`.
 *
 * Deduped per dataset: with the cache down, one visitor touring four routes
 * would otherwise emit an event per route and again after every cache lapse.
 */
async function notionQuery(page: Dataset): Promise<NotionPage[]> {
  const reportKey = `data_load_error:${page}`;
  const fail = (status: number) =>
    trackOnce(reportKey, 'data_load_error', { dataset: page, status });
  const dbId = DB_MAP[page];
  if (!dbId) {
    fail(0);
    throw Object.assign(
      new Error(
        `VITE_NOTION_DB_${page.toUpperCase()} is not set — add it to your env file and Netlify environment variables`,
      ),
      { status: 0 },
    );
  }

  // One hanging dataset would otherwise stall every page through allSettled.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(`${CACHE_API}/api/database/${dbId}`, { signal: ctrl.signal });
    } catch (err) {
      fail(-1);
      throw Object.assign(err as object, { status: -1 });
    }

    if (!res.ok) {
      fail(res.status);
      throw Object.assign(new Error(`Notion cache query failed: ${res.status}`), {
        status: res.status,
      });
    }

    let body: { results?: unknown };
    try {
      body = await res.json();
    } catch (err) {
      fail(-2);
      throw Object.assign(err as object, { status: -2 });
    }
    if (!Array.isArray(body?.results)) {
      fail(-2);
      throw Object.assign(new Error('Notion cache answered without a results array'), {
        status: -2,
      });
    }
    return body.results as NotionPage[];
  } finally {
    clearTimeout(timer);
  }
}

// ── Saved-data fallback ────────────────────────────────────────────────────
let lastFallback: FallbackInfo | null = null;

/** Module store, so a listener that mounts after the event still sees it. */
export function getLastFallback(): FallbackInfo | null {
  return lastFallback;
}

export function setLastFallback(info: FallbackInfo | null): void {
  lastFallback = info;
}

interface SnapshotData extends SiteData {
  ts: number;
}

let snapshotMemo: Promise<SnapshotData | null> | null = null;

function loadSnapshot(): Promise<SnapshotData | null> {
  snapshotMemo ??= (async () => {
    try {
      const r = await fetch('/data/snapshot.json');
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
      const s = await r.json();
      const data = s?.v === 1 ? sanitizeSaved(s) : null;
      return data && { ts: Date.parse(s.generatedAt), ...data };
    } catch {
      return null;
    }
  })();
  return snapshotMemo;
}

// ── Site data (all four datasets commit together) ──────────────────────────
let siteData: Promise<SiteData> | null = null;
let lastFailure: { at: number; reason: FallbackReason; error: unknown } | null = null;

async function resolveSiteData(): Promise<SiteData> {
  const cached = readBundle();
  if (cached && cached.ts <= Date.now() && Date.now() - cached.ts <= CACHE_TTL) return cached;

  // `lastFailure` is set only after a real live attempt, so this window never slides.
  if (!lastFailure || Date.now() - lastFailure.at >= RETRY_AFTER_FAILURE_MS) {
    const settled = await Promise.allSettled([
      notionQuery('about').then(parseAbout),
      notionQuery('projects').then(parseProjects),
      notionQuery('timeline').then(parseTimeline),
      notionQuery('experience').then(parseExperience),
    ]);
    const [about, projects, timeline, experience] = settled;
    if (
      about.status === 'fulfilled' &&
      projects.status === 'fulfilled' &&
      timeline.status === 'fulfilled' &&
      experience.status === 'fulfilled'
    ) {
      const data: SiteData = {
        about: about.value,
        projects: projects.value,
        timeline: timeline.value,
        experience: experience.value,
      };
      writeBundle(data, Date.now());
      return data;
    }
    const rejected = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    lastFailure = {
      at: Date.now(),
      reason: rejected.some(r => (r.reason as { status?: number })?.status === 429)
        ? 'rate_limited'
        : 'unavailable',
      error: rejected[0].reason,
    };
  }
  const failure = lastFailure;

  // Fallback: the newer of the stale local bundle and the build snapshot; a tie goes to local.
  const local = readBundle();
  const snap = await loadSnapshot();
  const useSnapshot = !!snap && (!local || (Number.isFinite(snap.ts) && snap.ts > local.ts));
  const chosen = useSnapshot ? snap : local;
  if (!chosen) throw failure.error;

  const source: FallbackSource = useSnapshot ? 'snapshot' : 'local';
  const info: FallbackInfo = { reason: failure.reason, savedAt: chosen.ts };
  setLastFallback(info);
  trackOnce('data_fallback_served', 'data_fallback_served', { reason: failure.reason, source });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notion:fallback', { detail: info }));
  }
  return chosen;
}

/**
 * One promise per page load. A resolved set (live, fresh or fallback) stays for
 * the whole page load, so every section shows the same set and live and saved
 * data never mix. Only a rejection clears the memo, so a later navigation can
 * try again once the 60 s window has passed.
 */
function loadSiteData(): Promise<SiteData> {
  if (!siteData) {
    const p = resolveSiteData();
    siteData = p;
    p.catch(() => {
      if (siteData === p) siteData = null;
    });
  }
  return siteData;
}

export function fetchAbout(): Promise<About> {
  return loadSiteData().then(d => d.about);
}

export function fetchProjects(): Promise<Project[]> {
  return loadSiteData().then(d => d.projects);
}

export function fetchTimeline(): Promise<TimelineEvent[]> {
  return loadSiteData().then(d => d.timeline);
}

export function fetchExperience(): Promise<Experience[]> {
  return loadSiteData().then(d => d.experience);
}
