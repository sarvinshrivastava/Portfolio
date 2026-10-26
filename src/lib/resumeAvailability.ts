import { useEffect, useState } from 'react';
import { RESUME_PATH } from '../content/profile';
import { trackOnce } from './analytics';

/**
 * The resume button shows only while `/resume.pdf` is actually served as a PDF.
 * An edge function gates the path to notion-cache (PDF only); if that is down
 * (or the SPA rewrite answers with HTML), a visible button would lead to a dead
 * page. The probe is a GET, not a HEAD, so the edge cache answers it exactly as
 * it answers a click, including a cached copy during a VPS outage. On success
 * the download is left to finish so the browser's HTTP-cache entry completes
 * and later loads revalidate with a 304.
 */

export const PROBE_TIMEOUT_MS = 5000;

let known = true;
let probe: Promise<boolean> | null = null;

/** One GET per page load. */
export function checkResume(): Promise<boolean> {
  probe ??= (async () => {
    let status: number;
    let res: Response | undefined;
    try {
      // A hung gate would otherwise leave a dead link on screen.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
      try {
        res = await fetch(RESUME_PATH, { signal: ctrl.signal });
        if (res.ok && (res.headers.get('content-type') ?? '').includes('application/pdf')) {
          void res.arrayBuffer().catch(() => {});
          return true;
        }
        status = res.status;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      status = -1;
    }
    // A body that fails to read or cancel never changes the result.
    void res?.body?.cancel().catch(() => {});
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
