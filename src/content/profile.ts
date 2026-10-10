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
  const [year, month] = iso.split('-');
  const name = MONTHS[Number(month) - 1];
  // Fails the build/tests rather than shipping "undefined 2024" to crawlers.
  if (!/^\d{4}$/.test(year) || !name) throw new Error(`monthYear: bad date ${iso}`);
  return `${name} ${year}`;
}
