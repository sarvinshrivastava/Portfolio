import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalUrl, seoRouteFor } from '../seo/site';

/**
 * Keeps title, description and canonical in step with client-side navigation.
 *
 * Each route's HTML file ships its own head (see src/seo/site.ts), but after the
 * first load react-router navigates without fetching HTML, so a visitor who
 * landed on /projects and clicked Home would keep the Projects title and
 * canonical (and umami would record the Projects title for the Home pageview).
 *
 * Only updates tags that already exist; unknown routes leave the head alone.
 */
export function useDocumentHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = seoRouteFor(pathname);
    if (!route) return;
    document.title = route.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', route.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl(route));
  }, [pathname]);
}
