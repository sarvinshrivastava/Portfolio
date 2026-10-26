import { describe, expect, it } from 'vitest';
import {
  HOME_ROUTE,
  PERSON_ID,
  SEO_ROUTES,
  SITE_URL,
  WEBSITE_ID,
  canonicalUrl,
  jsonLd,
  renderRouteHtml,
  renderShell,
  seoRouteFor,
  type SeoRoute,
} from '../../src/seo/site';
import { CERTIFICATIONS, PROFILES, RECOMMENDATIONS } from '../../src/content/profile';

/**
 * Contract tests for the build-time SEO output. geo.new and AI crawlers only
 * ever see these strings, never the hydrated app, so a regression here is
 * invisible in the browser. Parsed with jsdom's DOMParser so assertions are
 * about structure, not regex over markup.
 */

const TEMPLATE = `<!doctype html><html><head><meta charset="UTF-8" />
<!--seo:head-->
<script defer src="/umami.js" data-website-id="x"></script>
</head><body><div id="root"><!--seo:shell--></div></body></html>`;

function parse(r: SeoRoute): Document {
  return new DOMParser().parseFromString(renderRouteHtml(TEMPLATE, r), 'text/html');
}

function graph(doc: Document): Record<string, unknown>[] {
  const raw = doc.querySelector('script[type="application/ld+json"]')!.textContent!;
  return JSON.parse(raw)['@graph'];
}

const home = HOME_ROUTE;

describe('route table', () => {
  // geo.new measured 156 chars at 977px (≈6.26 px/char) as too wide; 145 ≈ 908px.
  it.each(SEO_ROUTES)('$path: title 30–70 and description 120–145 chars', r => {
    expect(r.title.length).toBeGreaterThanOrEqual(30);
    expect(r.title.length).toBeLessThanOrEqual(70);
    expect(r.description.length).toBeGreaterThanOrEqual(120);
    expect(r.description.length).toBeLessThanOrEqual(145);
  });

  it('builds canonicals on the production origin', () => {
    expect(canonicalUrl(home)).toBe('https://sarvinshrivastava.space/');
    expect(canonicalUrl(seoRouteFor('/projects')!)).toBe(
      'https://sarvinshrivastava.space/projects',
    );
  });

  it('resolves paths the way react-router matches them', () => {
    expect(seoRouteFor('/projects/')?.path).toBe('/projects');
    expect(seoRouteFor('/Projects')?.path).toBe('/projects');
    expect(seoRouteFor('/')?.path).toBe('/');
    expect(seoRouteFor('/foo')).toBeUndefined();
  });
});

describe.each(SEO_ROUTES)('$path rendered html', r => {
  const doc = parse(r);
  const root = doc.getElementById('root')!;

  it('has head tags for this route only', () => {
    expect(doc.title).toBe(r.title);
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(doc.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      r.description,
    );
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      canonicalUrl(r),
    );
    expect(doc.querySelector('meta[property="og:url"]')!.getAttribute('content')).toBe(
      canonicalUrl(r),
    );
  });

  it('keeps the injected umami tag', () => {
    expect(doc.querySelector('script[src="/umami.js"]')).not.toBeNull();
  });

  it('has exactly one non-empty h1 and every landmark', () => {
    const h1s = root.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent!.trim()).not.toBe('');
    for (const tag of ['header', 'nav', 'main', 'footer']) {
      expect(root.querySelector(tag), tag).not.toBeNull();
    }
  });

  it('links every route, the About section, email and the profiles', () => {
    const hrefs = [...root.querySelectorAll('a')].map(a => a.getAttribute('href'));
    for (const path of ['/', '/projects', '/experience', '/my-journey', '/#about']) {
      expect(hrefs).toContain(path);
    }
    expect(hrefs.some(h => h?.startsWith('mailto:'))).toBe(true);
    const profiles = Object.values(PROFILES).filter(p => hrefs.includes(p));
    expect(profiles.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the footer link row visible at every width', () => {
    const footerNav = root.querySelector('footer nav')!;
    expect(footerNav.className).not.toMatch(/\bhidden\b/);
    // every route, plus x, medium and email
    expect(footerNav.querySelectorAll('a').length).toBe(SEO_ROUTES.length + 3);
  });

  it('starts with the skip link to #main', () => {
    const first = root.querySelector('a')!;
    expect(first.getAttribute('href')).toBe('#main');
    expect(first.className).toBe('skip-to-content');
    expect(root.querySelectorAll('#main')).toHaveLength(1);
    expect(root.querySelector('main')!.id).toBe('main');
  });

  it('names the WebPage after the visible h1', () => {
    const page = graph(doc).find(n => n['@type'] === 'WebPage')!;
    expect(page.name).toBe(root.querySelector('h1')!.textContent);
  });

  it('emits a linked JSON-LD graph', () => {
    const nodes = graph(doc);
    const person = nodes.find(n => n['@type'] === 'Person')!;
    const page = nodes.find(n => n['@type'] === 'WebPage')!;
    const site = nodes.find(n => n['@type'] === 'WebSite');

    expect(person['@id']).toBe(PERSON_ID);
    expect(person.sameAs).toEqual(Object.values(PROFILES));
    expect((person.contactPoint as Record<string, string>).contactType).toBeTruthy();
    const credentials = person.hasCredential as Record<string, unknown>[];
    expect(credentials).toHaveLength(CERTIFICATIONS.length);
    credentials.forEach((c, i) => {
      expect(c.dateCreated).toBe(CERTIFICATIONS[i].date);
      expect(c).not.toHaveProperty('validFrom');
    });
    expect(page['@id']).toBe(`${canonicalUrl(r)}#webpage`);
    expect(page.isPartOf).toEqual({ '@id': WEBSITE_ID });
    expect(page.about).toEqual({ '@id': PERSON_ID });
    if (r.path === '/') {
      expect(site).toMatchObject({ '@id': WEBSITE_ID, publisher: { '@id': PERSON_ID } });
    } else {
      expect(site).toBeUndefined();
    }
    for (const n of nodes) expect(String(n['@id']).startsWith(`${SITE_URL}/`)).toBe(true);
  });
});

describe('shell mirrors the components it replaces', () => {
  const root = parse(home).getElementById('root')!;

  it('footer first row is exactly the React Footer: about · github · linkedin', () => {
    const span = root.querySelector('footer > div > span:nth-of-type(2)')!;
    expect([...span.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual([
      '/#about',
      PROFILES.github,
      PROFILES.linkedin,
    ]);
  });

  it('theme toggle shows Navbar\'s glyph for whichever theme the inline script set', () => {
    // Navbar renders ○ in dark and ● in light; the shell picks with a CSS variant.
    const [dark, light] = root.querySelectorAll('button[aria-label="Switch theme"] > span');
    expect(dark.textContent).toBe('○');
    expect([...dark.classList]).toEqual(['[[data-theme=light]_&]:hidden']);
    expect(light.textContent).toBe('●');
    expect([...light.classList]).toEqual(['hidden', '[[data-theme=light]_&]:inline']);
  });

  it('menu button reports collapsed, like Navbar', () => {
    expect(root.querySelector('button[aria-label="Toggle menu"]')!.getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('opens external profile links in a new tab, internal ones in place', () => {
    for (const a of root.querySelectorAll('footer a')) {
      const external = a.getAttribute('href')!.startsWith('https://');
      expect(a.getAttribute('target'), a.getAttribute('href')!).toBe(external ? '_blank' : null);
      if (external) expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});

describe('home shell', () => {
  const homeRoot = parse(home).getElementById('root')!;

  it('has the sections of Home.tsx, in order, with their fragment ids', () => {
    const ids = [...homeRoot.querySelectorAll('main > section')].map(s => s.id);
    expect(ids).toEqual(['hero', 'about', 'credentials', 'connect']);
    for (const id of ['about', 'credentials', 'connect']) {
      expect(homeRoot.querySelectorAll(`#${id}`)).toHaveLength(1);
    }
    // Every same-page fragment link resolves inside the served HTML.
    for (const a of homeRoot.querySelectorAll('a[href^="/#"], a[href^="#"]')) {
      const id = a.getAttribute('href')!.split('#')[1];
      expect(homeRoot.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it('marks up the recommendations as Reviews, on the home page only', () => {
    const reviews = graph(parse(home)).filter(n => n['@type'] === 'Review');
    expect(reviews).toHaveLength(RECOMMENDATIONS.length);
    reviews.forEach((r, i) => {
      expect(r).toEqual({
        '@type': 'Review',
        '@id': `${SITE_URL}/#review-${i + 1}`,
        itemReviewed: { '@id': PERSON_ID },
        author: { '@type': 'Person', name: RECOMMENDATIONS[i].name },
        reviewBody: RECOMMENDATIONS[i].text,
        datePublished: RECOMMENDATIONS[i].date,
      });
    });
    for (const r of SEO_ROUTES.filter(r => r !== home)) {
      expect(graph(parse(r)).some(n => n['@type'] === 'Review')).toBe(false);
    }
  });

  it('shows the trust signals without the opacity-0 reveal class', () => {
    const root = parse(home).getElementById('root')!;
    expect(root.querySelectorAll('figure > blockquote')).toHaveLength(2);
    expect(root.querySelectorAll('figure > figcaption')).toHaveLength(2);
    expect(root.innerHTML).not.toMatch(/reveal-section(?![\w-]*\s+revealed)/);
  });

  it('renders subpage headings as the page h1', () => {
    const root = parse(seoRouteFor('/projects')!).getElementById('root')!;
    expect(root.querySelector('h1')!.textContent).toBe("What I've Built");
  });
});

describe('escaping', () => {
  const hostile: SeoRoute = {
    ...home,
    title: 'A </script><script>alert(1)</script> & $& $\' title',
    description: 'desc $` $$ </script>',
  };

  it('cannot close the JSON-LD block early', () => {
    expect(jsonLd(hostile)).not.toContain('<');
    expect(jsonLd(hostile)).toContain('\\u003c/script>');
  });

  it('leaves $ replacement patterns literal', () => {
    const doc = parse(hostile);
    expect(doc.title).toBe(hostile.title);
    // Only the template's own umami tag; the hostile title produced no script.
    expect(doc.querySelectorAll('script:not([type])')).toHaveLength(1);
  });

  it('fails loudly when a marker is missing', () => {
    expect(() => renderRouteHtml(TEMPLATE.replace('<!--seo:head-->', ''), home)).toThrow(
      /seo:head/,
    );
    expect(() => renderRouteHtml(TEMPLATE.replace('<!--seo:shell-->', ''), home)).toThrow(
      /seo:shell/,
    );
  });

  it('escapes shell text', () => {
    expect(renderShell(seoRouteFor('/projects')!)).toContain('What I&#39;ve Built');
  });
});
