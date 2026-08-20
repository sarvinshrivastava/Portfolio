import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackOnce, type ScrollPercent } from '../lib/analytics';

const THRESHOLDS: ScrollPercent[] = [25, 50, 75, 100];

/**
 * Reports how far down each route the visitor actually got.
 *
 * Depth is a fraction of the SCROLLABLE distance, not of total page height —
 * at the top that is 0% however tall the page is, and at the bottom it is 100%.
 * Measuring against total height would instantly report 50% on a two-viewport
 * page before the visitor read anything.
 *
 * Mounted once in App; the route comes from the router, so a client-side
 * navigation starts a fresh set of thresholds. Each (path, pct) pair fires at
 * most once per visit — the dedupe lives in analytics.trackOnce, so scrolling
 * back up and down again does not re-send.
 *
 * A page shorter than the viewport can never scroll and so reports nothing.
 * That is deliberate: "read to the end" is meaningless without a scrollbar.
 */
export function useScrollDepth() {
  const { pathname } = useLocation();

  useEffect(() => {
    let queued = false;

    const depth = (): number | null => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return null;
      return (window.scrollY / scrollable) * 100;
    };

    /**
     * A client-side route change KEEPS the previous scroll position (this app
     * has no ScrollRestoration), so navigating from the bottom of one page
     * drops the visitor mid-way down the next one — and the browser's clamping
     * scroll event would otherwise credit every threshold up to there without
     * them reading a word. Anything at or below the arrival depth is therefore
     * never reported; only thresholds they deliberately scroll past count.
     */
    let baseline: number | null = null;
    const measureBaseline = () => {
      const arrival = depth() ?? 0;
      // Only ever lowers: a shrinking page must not retroactively raise the bar
      baseline = baseline === null ? arrival : Math.min(baseline, arrival);
    };
    let frame = requestAnimationFrame(measureBaseline);

    /**
     * The Notion-backed routes paint a `min-h-screen` loading shell first, so
     * on arrival `scrollable` is a few pixels of footer overhang rather than
     * zero. Land there from the bottom of a long page and the clamped scrollY
     * reads as ~100%, which would suppress all four thresholds for the entire
     * visit — even after the content lands and the page grows past 2000px.
     * So re-derive whenever the document GROWS (content arriving, an entry
     * expanding): the same clamped scrollY is a much smaller fraction of the
     * taller page. Height-gated rather than firing on every observation, since
     * a plain viewport resize is not new content to read.
     */
    let lastHeight = document.documentElement.scrollHeight;
    const observer = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      if (height <= lastHeight) return;
      lastHeight = height;
      measureBaseline();
    });
    observer.observe(document.documentElement);

    const report = () => {
      queued = false;
      const pct = depth();
      if (pct === null) return;

      for (const threshold of THRESHOLDS) {
        if (threshold <= (baseline ?? 0)) continue;
        // Epsilon: sub-pixel layout means the true bottom often lands at 99.9%
        if (pct + 0.5 >= threshold) {
          trackOnce(`scroll_depth:${pathname}:${threshold}`, 'scroll_depth', {
            pct: threshold,
            path: pathname,
          });
        }
      }
    };

    // Coalesce scroll bursts into one measurement per frame
    const onScroll = () => {
      if (queued) return;
      queued = true;
      // Keep the handle: a scroll in the same frame as a route change would
      // otherwise leave an uncancellable `report` that runs after teardown,
      // measuring the NEW page but crediting the OLD pathname it closed over.
      // Clobbering the baseline handle is safe — that callback only assigns a
      // local.
      frame = requestAnimationFrame(report);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);
}
