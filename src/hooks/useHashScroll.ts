import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Lands a cold load of `/#<id>` on the section, once, on mount.
 *
 * The static shell carries the same ids, so the browser has already scrolled
 * there before React mounts; createRoot then swaps in new nodes and the
 * position has to be re-applied to the real element. Layout effect, so it runs
 * before the browser paints the React tree:
 *  - `revealed` is added up front, so a `reveal-section` the visitor is already
 *    looking at does not blank to opacity 0 and fade back in;
 *  - `behavior: 'instant'`, because html has `scroll-behavior: smooth` and a
 *    smooth scroll started during page load gets cancelled.
 * Mount-only and ref-guarded: re-running later would yank a reader who has
 * already scrolled away, and the guard also absorbs StrictMode's re-run.
 */
export function useHashScroll(ref: RefObject<HTMLElement | null>, hash: string): void {
  const done = useRef(false);

  useLayoutEffect(() => {
    if (done.current || window.location.hash !== hash) return;
    done.current = true;
    const el = ref.current;
    if (!el) return;
    el.classList.add('revealed');
    el.scrollIntoView({ behavior: 'instant' });
  }, [ref, hash]);
}
