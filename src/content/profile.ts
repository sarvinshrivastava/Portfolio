/**
 * Hardcoded profile facts shared by the rendered app (Connect, Footer,
 * Credentials) and the build-time SEO output (src/seo/site.ts). Pure data with
 * no DOM or React imports, because vite.config.ts imports it at build time.
 *
 * The Notion About record still wins at runtime wherever a component reads
 * `useAbout()`; these values are the static fallback and the crawlable copy.
 * Recommendations and certifications were confirmed by the owner from their
 * LinkedIn profile on 2026-10-10. Quotes are verbatim; do not edit their text.
 */

import type { SocialNetwork } from '../lib/analytics';
import type { About } from '../types';

/** Same-origin path: an edge function gates it to notion-cache's daily-rendered PDF (PDF only). */
export const RESUME_PATH = '/resume.pdf';

export const PERSON = {
  name: 'Sarvin Shrivastava',
  url: 'https://sarvinshrivastava.space',
  email: 'sarvin5124@gmail.com',
  jobTitle: 'Full-Stack Developer',
  worksFor: 'Habuild Healthtech',
  image: '/profile-pic.webp',
} as const;

export const PROFILES = {
  github: 'https://github.com/sarvinshrivastava',
  linkedin: 'https://www.linkedin.com/in/sarvin-shrivastava-493b20176',
  x: 'https://x.com/sarvin5124',
  medium: 'https://medium.com/@sarvin5124',
} as const;

export interface Recommendation {
  name: string;
  role: string;
  relation: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  text: string;
}

export const RECOMMENDATIONS: readonly Recommendation[] = [
  {
    name: 'Sunil Kumar Singh',
    role: 'Technical Manager',
    relation: 'managed Sarvin directly',
    date: '2024-09-20',
    text: 'I recommend Sarvin for his skills in Blender 3D and Unity. During his tenure he quickly learnt and demonstrated strong knowledge of 3D modelling and animation using Blender and Unity tools. He is a collaborative team player who is always willing to share his knowledge and assist others. I recommend him for any opportunity in 3d space.',
  },
  {
    name: 'Chetan Vashistth',
    role: 'Software Developer',
    relation: 'senior to Sarvin',
    date: '2024-08-22',
    text: 'Sarvin has a strong interest in 3D design, VR/AR and related stuff. He has very strong learning capabilities and can learn new things quickly. He takes the ownership, so I recommend him for anything related to AR/VR, 3D, and Metaverse.',
  },
];

export interface Certification {
  name: string;
  issuer: string;
  /** Issue month, YYYY-MM. */
  date: string;
}

export const CERTIFICATIONS: readonly Certification[] = [
  { name: 'Claude Code in Action', issuer: 'Anthropic', date: '2026-03' },
  { name: 'Claude 101', issuer: 'Anthropic', date: '2026-03' },
  { name: 'Python Essentials 1', issuer: 'Cisco Networking Academy', date: '2025-04' },
  {
    name: 'Career Essentials in GitHub Professional Certificate',
    issuer: 'GitHub',
    date: '2024-12',
  },
  { name: 'Postman API Fundamentals Student Expert', issuer: 'Postman', date: '2024-07' },
  { name: 'Unity and C# basics', issuer: 'Coursera (Meta)', date: '2024-06' },
  { name: 'Unity Essentials Pathway', issuer: 'Unity', date: '2024-05' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2024-09-20' or '2024-09' → 'Sep 2024'. Pure string math, no Date (no time zone drift). */
export function monthYear(iso: string): string {
  // Fails the build/tests rather than shipping "undefined 2024" to crawlers.
  // The data is static and every entry is rendered in tests, so this never
  // reaches a visitor's browser.
  if (!/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/.test(iso)) {
    throw new Error(`monthYear: bad date ${iso}`);
  }
  const [year, month] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// ── Section copy and links shared by the app and the static shell ──────────
// One source each, so the shell in src/seo/site.ts and the component it stands
// in for cannot drift apart. tests/unit/shell-parity.test.ts compares them.

export interface HeadingCopy {
  prefix: string;
  title: string;
  subtitle?: string;
}

export const ABOUT_HEADING: HeadingCopy = { prefix: '## about', title: 'Who I Am' };

export const CREDENTIALS_HEADING: HeadingCopy = {
  prefix: '## testimonials',
  title: 'What Others Say',
  subtitle: "Recommendations from people I've worked with, and certifications I've earned.",
};

export const CONNECT_HEADING: HeadingCopy = {
  prefix: '## connect',
  title: 'Get In Touch',
  subtitle: 'Have a project in mind, or just want to say hi? Drop a message.',
};

/** Notion About "Bio", verbatim as fetched from the notion cache on 2026-10-10. */
export const BIO =
  "I'm Sarvin — a Full-Stack Developer at Habuild Healthtech, passionate about building intelligent, scalable systems. I lead the AR/VR domain at Technocrats, have multiple published patents, and recently graduated with a B.Tech in Computer Science and Engineering from KIET Group of Institutions (First Division). When I'm not coding, I'm exploring photography, or tinkering with AR prototypes.";

/**
 * What About shows before Notion answers, or when it never does. It is also
 * exactly what the static shell renders, so the swap to React changes nothing.
 */
export const STATIC_ABOUT: About = {
  bio: BIO,
  github: PROFILES.github,
  linkedin: PROFILES.linkedin,
  x: PROFILES.x,
  medium: PROFILES.medium,
  email: PERSON.email,
  roles: [],
};

export interface SocialEntry {
  href: string;
  prefix: string;
  label: string;
  external: boolean;
  network: SocialNetwork;
}

/** About's link list; entries whose field is missing are skipped. */
export function aboutSocialLinks(data: About): SocialEntry[] {
  const links: SocialEntry[] = [];
  if (data.github) {
    links.push({
      href: data.github,
      prefix: '$ git clone',
      label: 'GitHub',
      external: true,
      network: 'github',
    });
  }
  if (data.linkedin) {
    links.push({
      href: data.linkedin,
      prefix: '$ connect',
      label: 'LinkedIn',
      external: true,
      network: 'linkedin',
    });
  }
  if (data.x) {
    links.push({
      href: data.x,
      prefix: '$ follow',
      label: 'X / Twitter',
      external: true,
      network: 'x',
    });
  }
  if (data.medium) {
    links.push({
      href: data.medium,
      prefix: '$ read',
      label: 'Medium',
      external: true,
      network: 'medium',
    });
  }
  if (data.email) {
    links.push({
      href: `mailto:${data.email}`,
      prefix: '$ mail',
      label: data.email,
      external: false,
      network: 'email',
    });
  }
  return links;
}

export interface Contact {
  network: SocialNetwork;
  label: string;
  href: string;
  text: string;
  external: boolean;
}

/** Connect's "or reach me at" aside. */
export const CONTACTS: readonly Contact[] = [
  {
    network: 'email',
    label: 'email',
    href: `mailto:${PERSON.email}`,
    text: PERSON.email,
    external: false,
  },
  {
    network: 'github',
    label: 'github',
    href: PROFILES.github,
    text: 'sarvinshrivastava',
    external: true,
  },
  {
    network: 'linkedin',
    label: 'linkedin',
    href: PROFILES.linkedin,
    text: 'sarvin-shrivastava-493b20176',
    external: true,
  },
];
