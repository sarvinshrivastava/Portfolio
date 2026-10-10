import { CERTIFICATIONS, PERSON, PROFILES, RECOMMENDATIONS, monthYear } from '../content/profile';

/**
 * Build-time SEO for a client-rendered SPA.
 *
 * Crawlers (geo.new, most AI fetchers) read the HTML Netlify serves and never run
 * our JS, so an empty `<div id="root">` reads as a blank page. The `seo()` plugin
 * in vite.config.ts uses these functions to write one HTML file per route with
 * its own head tags, JSON-LD and a static shell inside #root. `createRoot`
 * clears that shell on its first commit, so the shell must mirror each route's
 * real first paint or the swap is visible. Keep its class strings in step with
 * Navbar, Hero, Footer, SectionHeading and Credentials.
 *
 * Pure strings only: this module is imported by vite.config.ts at build time and
 * by the app at runtime (useDocumentHead), so no DOM and no React.
 */

export const SITE_URL = PERSON.url;
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
const IMAGE_URL = `${SITE_URL}${PERSON.image}`;

interface SectionHeadingCopy {
  prefix: string;
  title: string;
  subtitle: string;
}

interface SeoRouteBase {
  path: string;
  /** Emitted file name in dist/. Flat, so Netlify serves /projects without a trailing-slash 301. */
  file: string;
  title: string;
  description: string;
}

export type SeoRoute = SeoRouteBase &
  (
    | { shell: 'home' }
    | {
        shell: 'section';
        /** Page-level SectionHeading copy; mirrors the page component exactly. */
        heading: SectionHeadingCopy;
      }
  );

/** The route whose file is index.html; also the dev and unknown-path fallback. */
export const HOME_ROUTE: SeoRoute = {
  path: '/',
  file: 'index.html',
  title: 'Sarvin Shrivastava — Full-Stack Developer & AR/VR Engineer',
  description:
    'Sarvin Shrivastava: Full-Stack Developer at Habuild Healthtech and AR/VR engineer with published patents, building interfaces, AR experiences and dev tools.',
  shell: 'home',
};

export const SEO_ROUTES: readonly SeoRoute[] = [
  HOME_ROUTE,
  {
    path: '/projects',
    file: 'projects.html',
    title: 'Projects by Sarvin Shrivastava — Tools, AR and Web Apps',
    description:
      "What I've Built: a mix of tools, AR experiences, and web apps by Sarvin Shrivastava, a Full-Stack Developer and AR/VR engineer at Habuild Healthtech.",
    shell: 'section',
    heading: {
      prefix: '## projects',
      title: "What I've Built",
      subtitle: 'A mix of tools, AR experiences, and web apps.',
    },
  },
  {
    path: '/experience',
    file: 'experience.html',
    title: 'Experience — Sarvin Shrivastava, Full-Stack Developer',
    description:
      "Where I've Worked: internships, leadership roles, and real-world impact from Sarvin Shrivastava, Full-Stack Developer at Habuild Healthtech.",
    shell: 'section',
    heading: {
      prefix: '## experience',
      title: "Where I've Worked",
      subtitle: 'Internships, leadership roles, and real-world impact.',
    },
  },
  {
    path: '/my-journey',
    file: 'my-journey.html',
    title: 'My Journey — Sarvin Shrivastava, Milestones and Education',
    description:
      'The Story So Far: milestones, education, and the moments that shaped Sarvin Shrivastava, from a B.Tech in Computer Science at KIET to Habuild Healthtech.',
    shell: 'section',
    heading: {
      prefix: '## my-journey',
      title: 'The Story So Far',
      subtitle: 'Milestones, education, and the moments that shaped me.',
    },
  },
];

/** Same order and labels as Navbar's NAV_LINKS. */
const NAV = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/my-journey', label: 'My Journey' },
  { to: '/experience', label: 'Experience' },
];

/**
 * react-router v6 matches case-insensitively and tolerates a trailing slash, so
 * `/Projects/` renders Projects; the lookup has to agree or the head goes stale.
 */
export function seoRouteFor(pathname: string): SeoRoute | undefined {
  const normalized = pathname.length > 1 ? pathname.toLowerCase().replace(/\/+$/, '') : pathname;
  return SEO_ROUTES.find(r => r.path === (normalized || '/'));
}

export function canonicalUrl(r: SeoRoute): string {
  return r.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function jsonLd(r: SeoRoute): string {
  const canonical = canonicalUrl(r);
  const person = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: PERSON.name,
    url: `${SITE_URL}/`,
    image: IMAGE_URL,
    jobTitle: PERSON.jobTitle,
    email: `mailto:${PERSON.email}`,
    worksFor: { '@type': 'Organization', name: PERSON.worksFor },
    sameAs: Object.values(PROFILES),
    contactPoint: { '@type': 'ContactPoint', contactType: 'personal', email: PERSON.email },
    hasCredential: CERTIFICATIONS.map(c => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.name,
      credentialCategory: 'certificate',
      recognizedBy: { '@type': 'Organization', name: c.issuer },
      // CreativeWork's date; schema.org has no issue-date property on this type.
      dateCreated: c.date,
    })),
  };
  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: PERSON.name,
    publisher: { '@id': PERSON_ID },
  };
  const webpage = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: r.title,
    description: r.description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
  };
  const graph = r.path === '/' ? [person, website, webpage] : [person, webpage];
  // `<` escaped so no string value can close the <script> data block early.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  );
}

export function renderHead(r: SeoRoute): string {
  const title = escapeHtml(r.title);
  const description = escapeHtml(r.description);
  const canonical = escapeHtml(canonicalUrl(r));
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${escapeHtml(IMAGE_URL)}" />`,
    `<script type="application/ld+json">${jsonLd(r)}</script>`,
  ].join('\n    ');
}

// ── Shell ──────────────────────────────────────────────────────────────────
// Class strings below are copied from the components named in each comment.

function header(r: SeoRoute): string {
  // Navbar.tsx in its unscrolled state. No ids and a different nav label from
  // the app's "Main navigation", although React replaces the shell anyway.
  const links = NAV.map(({ to, label }) => {
    const active = to === r.path;
    const cls = `nav-link relative font-mono text-[0.8125rem] tracking-wide transition-colors ${
      active ? 'active text-text' : 'text-text-muted hover:text-text'
    }`;
    return `<li><a href="${to}" class="${cls}"${active ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a></li>`;
  }).join('');
  return `<header class="fixed top-0 left-0 right-0 z-100 transition-[background,border-color] border-b border-transparent">
<nav class="container flex items-center justify-between h-16" aria-label="Site">
<a href="/" class="font-mono text-base font-bold text-text tracking-tight hover:opacity-100" aria-label="Sarvin Shrivastava — home"><span class="text-accent">~/</span>sarvin</a>
<ul class="hidden md:flex list-none gap-8" role="list">${links}</ul>
<div class="flex items-center gap-4">
<button type="button" class="bg-transparent border border-border text-text-muted text-base w-9 h-9 rounded cursor-pointer transition-[color,border-color] flex items-center justify-center hover:text-accent hover:border-accent" aria-label="Switch theme"><span class="[[data-theme=light]_&]:hidden">○</span><span class="hidden [[data-theme=light]_&]:inline">●</span></button>
<button type="button" class="flex md:hidden flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1" aria-expanded="false" aria-label="Toggle menu"><span class="block w-[22px] h-0.5 bg-text rounded-sm transition-all"></span><span class="block w-[22px] h-0.5 bg-text rounded-sm transition-all"></span><span class="block w-[22px] h-0.5 bg-text rounded-sm transition-all"></span></button>
</div>
</nav>
</header>`;
}

function sectionHeading(h: SectionHeadingCopy, level: 'h1' | 'h2'): string {
  // SectionHeading.tsx
  return `<div class="mb-12">
<p class="font-mono text-[0.8125rem] text-accent mb-2 tracking-[0.04em]">${escapeHtml(h.prefix)}</p>
<${level} class="font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-text leading-[1.15] tracking-[-0.03em]">${escapeHtml(h.title)}</${level}>
<p class="mt-3 text-[0.9375rem] text-text-muted max-w-[540px]">${escapeHtml(h.subtitle)}</p>
</div>`;
}

function hero(): string {
  // Hero.tsx, before the roles typewriter starts and before Notion returns resumeUrl.
  return `<section class="min-h-screen flex items-center pt-24 pb-16 max-[480px]:pt-20 max-[480px]:pb-12" aria-label="Introduction">
<div class="container grid grid-cols-2 gap-16 items-center max-[900px]:grid-cols-1 max-[900px]:gap-10">
<div class="bg-bg-secondary border border-border rounded-lg overflow-hidden font-mono text-sm max-[900px]:-order-1">
<div class="bg-bg-tertiary border-b border-border px-4 py-[0.6rem] flex items-center gap-[0.4rem]"><span class="w-3 h-3 rounded-full inline-block bg-[#ff5f57]"></span><span class="w-3 h-3 rounded-full inline-block bg-[#febc2e]"></span><span class="w-3 h-3 rounded-full inline-block bg-[#28c840]"></span><span class="ml-3 text-xs text-text-muted">sarvin@portfolio:~</span></div>
<div class="px-6 py-5 min-h-[120px]">
<p class="leading-relaxed"><span class="text-accent">➜ ~ </span><span class="text-text">whoami</span></p>
<p class="pl-4 text-text-muted leading-relaxed min-h-[1.6em]">Sarvin Shrivastava</p>
<p class="leading-relaxed mt-2"><span class="text-accent">➜ ~ </span><span class="text-text">cat roles.txt</span></p>
<p class="pl-4 text-text-muted leading-relaxed min-h-[1.6em]"><span class="text-accent animate-[blink_1s_step-end_infinite]" aria-hidden="true">▌</span></p>
</div>
</div>
<div class="flex flex-col gap-5">
<p class="font-mono text-sm text-accent tracking-[0.06em]">Hello, World.</p>
<h1 class="font-mono text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.04em] text-text">Sarvin Shrivastava</h1>
<p class="text-base text-text-muted max-w-[440px] leading-[1.7]">I build interfaces, AR experiences, and tools that <span class="text-accent">make developers' lives easier.</span></p>
<div class="flex gap-4 flex-wrap mt-2">
<a href="/projects" class="inline-flex items-center gap-2 bg-accent text-black font-mono text-sm font-bold px-6 py-3 rounded-[var(--radius)] transition-[opacity,transform] duration-200 ease-in-out hover:opacity-85 hover:-translate-y-px">View Projects <span aria-hidden="true">→</span></a>
<a href="/#connect" class="inline-flex items-center font-mono text-sm text-text-muted border border-border px-6 py-3 rounded-[var(--radius)] transition-[color,border-color,transform] duration-200 ease-in-out hover:opacity-100 hover:text-text hover:border-text-muted hover:-translate-y-px">Get In Touch</a>
</div>
</div>
</div>
</section>`;
}

/** Shared with Credentials.tsx so the shell and the component cannot drift. */
export const CREDENTIALS_HEADING: SectionHeadingCopy = {
  prefix: '## endorsements',
  title: 'What Others Say',
  subtitle: "Recommendations from people I've worked with, and certifications I've earned.",
};

export function credentialsSection(): string {
  // Credentials.tsx, minus `reveal-section`: that class is opacity 0 until JS
  // adds `.revealed`, which would hide from readers what crawlers still read.
  const quotes = RECOMMENDATIONS.map(
    rec => `<figure class="bg-bg-secondary border border-border rounded-lg p-6 flex flex-col gap-4">
<blockquote class="text-text text-[0.9375rem] leading-[1.7]">“${escapeHtml(rec.text)}”</blockquote>
<figcaption class="font-mono text-[0.8125rem]"><span class="text-text">${escapeHtml(rec.name)}</span><span class="text-text-muted"> — ${escapeHtml(rec.role)}, ${escapeHtml(rec.relation)} · ${monthYear(rec.date)}</span></figcaption>
</figure>`,
  ).join('\n');
  const certs = CERTIFICATIONS.map(
    c => `<li class="flex flex-col gap-1"><span class="text-text text-[0.9375rem]">${escapeHtml(c.name)}</span><span class="font-mono text-xs text-text-muted">${escapeHtml(c.issuer)} · ${monthYear(c.date)}</span></li>`,
  ).join('');
  return `<section class="py-24" aria-label="Recommendations and certifications">
<div class="container">
${sectionHeading(CREDENTIALS_HEADING, 'h2')}
<div class="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
${quotes}
</div>
<h3 class="font-mono text-sm text-accent mt-12 mb-4">$ ls certifications/</h3>
<ul class="grid grid-cols-2 gap-x-8 gap-y-4 max-[900px]:grid-cols-1" role="list">${certs}</ul>
</div>
</section>`;
}

function footer(): string {
  // Footer.tsx exactly (about · github · linkedin), plus one extra row. The
  // header links are `hidden md:flex`, so without the row a no-JS mobile reader
  // gets no navigation; it also carries the profiles and email crawlers look
  // for. The footer is below the fold on every route, so the row never shows
  // during the swap to React.
  const link = (href: string, label: string, external = false) =>
    `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} class="font-mono">${escapeHtml(label)}</a>`;
  const row = [
    ...NAV.map(({ to, label }) => link(to, label)),
    link(PROFILES.x, 'x', true),
    link(PROFILES.medium, 'medium', true),
    link(`mailto:${PERSON.email}`, 'email'),
  ].join(' · ');
  return `<footer class="border-t border-border mt-24 py-8">
<div class="container flex justify-between items-center flex-wrap gap-2 text-[0.8125rem]">
<span><span class="text-accent font-mono">~/sarvin</span><span class="text-muted"> — built with React + Vite</span></span>
<span>${link('/#about', 'about')} · ${link(PROFILES.github, 'github', true)} · ${link(PROFILES.linkedin, 'linkedin', true)}</span>
<nav class="w-full" aria-label="Site pages">${row}</nav>
</div>
</footer>`;
}

export function renderShell(r: SeoRoute): string {
  const main =
    r.shell === 'home'
      ? `<main>\n${hero()}\n${credentialsSection()}\n</main>`
      : `<main class="pt-28 pb-16 min-h-screen">\n<div class="container">\n${sectionHeading(r.heading, 'h1')}\n</div>\n</main>`;
  return `${header(r)}\n${main}\n${footer()}`;
}

export const HEAD_MARKER = '<!--seo:head-->';
export const SHELL_MARKER = '<!--seo:shell-->';

/** Fills both markers. Function replacers so `$&`/`$'` in copy stay literal. */
export function renderRouteHtml(template: string, r: SeoRoute): string {
  for (const marker of [HEAD_MARKER, SHELL_MARKER]) {
    if (!template.includes(marker)) throw new Error(`seo: ${marker} missing from index.html`);
  }
  return template
    .replace(HEAD_MARKER, () => renderHead(r))
    .replace(SHELL_MARKER, () => renderShell(r));
}
