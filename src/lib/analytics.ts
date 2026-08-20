/**
 * Thin typed wrapper over the self-hosted umami tracker.
 *
 * The tracker script is injected into index.html at BUILD time only
 * (see the umami plugin in vite.config.ts), so `window.umami` is absent in
 * `vite dev`, in tests, and whenever a visitor blocks the script. Every export
 * here is a no-op in those cases — callers never need to guard.
 *
 * Privacy rule for this file: no visitor-typed free text ever becomes a
 * property. Contact-form events carry field NAMES and validation messages we
 * authored, never the name/email/message the visitor entered.
 */

import type { Dataset } from '../types';

type PropertyValue = string | number | boolean;

interface Umami {
  track: (name: string, data?: Record<string, PropertyValue>) => void;
  identify: (data: Record<string, PropertyValue>) => void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

export type ResumeSource = 'navbar' | 'hero' | 'mobile_menu' | 'keyboard';

export type SocialNetwork = 'github' | 'linkedin' | 'x' | 'medium' | 'email';

export type SocialLocation = 'about' | 'footer' | 'connect_aside';

export type ScrollPercent = 25 | 50 | 75 | 100;

export type { Dataset };

/**
 * Every event the site can emit, with its exact property shape. `void` means
 * the event carries no properties. Adding an event here is what makes it
 * callable — `track()` rejects unknown names at compile time.
 */
export interface EventPayloads {
  // ── Conversions ──────────────────────────────────────────────────────────
  resume_open: { source: ResumeSource };
  contact_form_start: void;
  contact_form_submit: void;
  contact_form_success: void;
  contact_form_error: { reason: string };
  social_click: { network: SocialNetwork; location: SocialLocation };
  project_source_click: {
    project: string;
    category: string;
    featured: boolean;
  };

  // ── Engagement ───────────────────────────────────────────────────────────
  project_filter: { category: string };
  journey_commit_expand: { title: string; category: string };
  scroll_depth: { pct: ScrollPercent; path: string };
  contact_validation_error: { field: string; error: string };

  // ── Health ───────────────────────────────────────────────────────────────
  data_load_error: { dataset: Dataset; status: number };
  js_error: { message: string; source: string };
}

export type EventName = keyof EventPayloads;

type TrackArgs<K extends EventName> = K extends EventName
  ? EventPayloads[K] extends void
    ? [name: K]
    : [name: K, data: EventPayloads[K]]
  : never;

type QueuedEvent = [EventName, Record<string, PropertyValue> | undefined];

/**
 * Events emitted before the tracker script finishes loading.
 *
 * This matters more than it looks: the app's module script is deferred AHEAD of
 * the tracker in index.html, so React mounts and `fetchAbout()` can fail before
 * `window.umami` exists — and the health events (`data_load_error`) are exactly
 * the ones most likely to fire that early. umami has no pre-load queue of its
 * own, so without this they vanish silently.
 *
 * Capped so a tracker that never arrives (ad-blocker, dead host) can't grow an
 * unbounded array; past the cap the oldest events are simply dropped.
 */
const pending: QueuedEvent[] = [];
const MAX_PENDING = 50;
const FLUSH_RETRIES = 8;
const FLUSH_INTERVAL_MS = 500;
let flushScheduled = false;

function flush(): boolean {
  const umami = window.umami;
  if (!umami) return false;
  for (const [name, data] of pending.splice(0)) umami.track(name, data);
  return true;
}

/**
 * Wait for the tracker, then drain the queue.
 *
 * Deliberately polls instead of installing a `window.umami` stub: the real
 * tracker guards its own install with `window.umami || (window.umami = {...})`,
 * so a stub placed there first would shadow it PERMANENTLY — killing every
 * event including umami's own auto-pageviews.
 */
function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;

  let attemptsLeft = FLUSH_RETRIES;
  const attempt = () => {
    if (flush() || attemptsLeft-- <= 0) {
      flushScheduled = false;
      return;
    }
    window.setTimeout(attempt, FLUSH_INTERVAL_MS);
  };

  if (document.readyState === 'complete') attempt();
  else window.addEventListener('load', attempt, { once: true });
}

function send(name: EventName, data?: Record<string, PropertyValue>): void {
  if (!import.meta.env.PROD) return;

  if (window.umami) {
    window.umami.track(name, data);
    return;
  }

  if (pending.length >= MAX_PENDING) pending.shift();
  pending.push([name, data]);
  scheduleFlush();
}

export function track<K extends EventName>(...args: TrackArgs<K>): void {
  send(args[0], args[1] as Record<string, PropertyValue> | undefined);
}

const fired = new Set<string>();

/**
 * Fire an event at most once per page session, deduped on `key`. Used for
 * events that would otherwise repeat on every keystroke or scroll tick
 * (contact_form_start, scroll_depth). The set is module state, so a
 * client-side route change does NOT reset it — include the path in `key` when
 * an event should be able to fire again on another route.
 */
export function trackOnce<K extends EventName>(key: string, ...args: TrackArgs<K>): void {
  if (fired.has(key)) return;
  fired.add(key);
  send(args[0], args[1] as Record<string, PropertyValue> | undefined);
}

/**
 * Click handler for an outbound social link. Exists because the same three-line
 * arrow was repeated at six call sites across Footer, About, and Connect.
 */
export function trackSocial(network: SocialNetwork, location: SocialLocation): () => void {
  return () => track('social_click', { network, location });
}

/**
 * Report uncaught errors and rejected promises.
 *
 * Without this a render crash is a white screen that still records a perfectly
 * healthy pageview — the dashboard cannot tell a broken site from a quiet one.
 * Only our own message and source are sent; nothing reads page content.
 */
export function installErrorTracking(): () => void {
  const onError = (e: ErrorEvent) => {
    track('js_error', {
      message: (e.message || 'unknown').slice(0, 200),
      source: `${e.filename || 'unknown'}:${e.lineno ?? 0}`,
    });
  };

  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    track('js_error', { message: message.slice(0, 200), source: 'unhandledrejection' });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
