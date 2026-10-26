import { useEffect, useState } from 'react';
import { RESUME_PATH } from '../content/profile';
import { trackOnce } from './analytics';

/**
 * The resume button shows only while `/resume.pdf` is actually served as a PDF.
 * Netlify proxies the path to notion-cache; if that is down (or the SPA rewrite
 * answers with HTML), a visible button would lead to a dead page.
 */

const PROBE_TIMEOUT_MS = 5000;

let known = true;
let probe: Promise<boolean> | null = null;

/** One HEAD request per page load. */
export function checkResume(): Promise<boolean> {
  probe ??= (async () => {
    let status: number;
    try {
      // A hung proxy would otherwise leave a dead link on screen.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
      try {
        const res = await fetch(RESUME_PATH, { method: 'HEAD', signal: ctrl.signal });
        if (res.ok && (res.headers.get('content-type') ?? '').includes('application/pdf')) {
          return true;
        }
        status = res.status;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      status = -1;
    }
    known = false;
    trackOnce('resume_unavailable', 'resume_unavailable', { status });
    return false;
  })();
  return probe;
}

/** The last known value; `true` until the probe says otherwise. */
export function isResumeAvailable(): boolean {
  return known;
}

/**
 * Optimistic (`true`) until the probe fails, so the first paint matches the
 * static shell; a component mounted after a failed probe never shows the link.
 */
export function useResumeAvailable(): boolean {
  const [available, setAvailable] = useState(() => isResumeAvailable());
  useEffect(() => {
    let live = true;
    checkResume().then(ok => {
      if (live) setAvailable(ok);
    });
    return () => {
      live = false;
    };
  }, []);
  return available;
}
