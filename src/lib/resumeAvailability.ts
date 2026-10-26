import { useEffect, useState } from 'react';
import { RESUME_PATH } from '../content/profile';
import { trackOnce } from './analytics';

/**
 * The resume button shows only while `/resume.pdf` is actually served as a PDF.
 * Netlify proxies the path to notion-cache; if that is down (or the SPA rewrite
 * answers with HTML), a visible button would lead to a dead page.
 */

let known = true;
let probe: Promise<boolean> | null = null;

/** One HEAD request per page load. */
export function checkResume(): Promise<boolean> {
  probe ??= (async () => {
    try {
      const res = await fetch(RESUME_PATH, { method: 'HEAD' });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('application/pdf')) {
        known = true;
      } else {
        known = false;
        trackOnce('resume_unavailable', 'resume_unavailable', { status: res.status });
      }
    } catch {
      known = false;
      trackOnce('resume_unavailable', 'resume_unavailable', { status: -1 });
    }
    return known;
  })();
  return probe;
}

/** The last known value; `true` until the probe says otherwise. */
export function isResumeAvailable(): boolean {
  return known;
}

/** Optimistic (`true`) first, so the first paint matches the static shell. */
export function useResumeAvailable(): boolean {
  const [available, setAvailable] = useState(true);
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
