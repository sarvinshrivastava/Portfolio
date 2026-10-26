import { useEffect, useState } from 'react';
import { getLastFallback, type FallbackInfo } from '../../services/notion';

const HIDE_AFTER_MS = 8000;
const SESSION_KEY = 'fallback-toast-shown';

/**
 * Set when the toast first becomes visible. The module flag alone is enough
 * when storage throws; sessionStorage adds "once per visit" across reloads.
 */
let shown = false;

function alreadyShown(): boolean {
  if (shown) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markShown() {
  shown = true;
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // storage blocked — the module flag still covers this page load
  }
}

function messageFor({ reason, savedAt }: FallbackInfo): string {
  const lead =
    reason === 'rate_limited'
      ? '$ rate limit reached — showing saved data'
      : "$ couldn't reach the server — showing saved data";
  const date = new Date(savedAt);
  if (!Number.isFinite(savedAt) || Number.isNaN(date.getTime())) return lead;
  const t = date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${lead} from ${t}`;
}

/**
 * Tells the visitor, once per visit, that the site is showing saved data.
 * The sr-only live region is mounted from the first render so the text change
 * is announced; the visible box exists only while shown.
 */
export function FallbackToast() {
  const [info, setInfo] = useState<FallbackInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const show = (detail: FallbackInfo | null) => {
      if (!detail || alreadyShown()) return;
      markShown();
      setInfo(detail);
      setVisible(true);
    };
    show(getLastFallback());
    const onFallback = (e: Event) => show((e as CustomEvent<FallbackInfo>).detail);
    window.addEventListener('notion:fallback', onFallback);
    return () => window.removeEventListener('notion:fallback', onFallback);
  }, []);

  useEffect(() => {
    if (!visible || paused) return;
    const timer = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [visible, paused]);

  const hide = () => setVisible(false);
  const pause = () => setPaused(true);
  const resume = () => setPaused(false);
  const message = info ? messageFor(info) : '';

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">{visible ? message : ''}</span>
      {visible && (
        <div
          className="fixed bottom-4 right-4 max-[480px]:left-4 z-50 flex items-start gap-3 bg-bg-secondary border border-border rounded-[var(--radius)] font-mono text-sm px-4 py-3 motion-safe:transition-opacity motion-safe:duration-200"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
        >
          <p aria-hidden="true">{message}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={hide}
            className="bg-transparent border-none text-text-muted cursor-pointer leading-none hover:text-text"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
