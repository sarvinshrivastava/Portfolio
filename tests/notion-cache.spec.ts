import { test, expect, type Page, type Request } from '@playwright/test';

const CACHE_BASE = 'https://notion-cache.vps.sarvinshrivastava.space';

// The database ids live in the environment, same as the app reads them in
// src/services/notion.ts. playwright.config.ts loads them from the env file
// before this module is evaluated.
function requireDbId(name: string): string {
  const key = `VITE_NOTION_DB_${name}`;
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `${key} is not set. Playwright loads it via playwright.config.ts; ` +
        `set it in the env file or export it before running.`,
    );
  }
  return value;
}

const DB_IDS = {
  about: requireDbId('ABOUT'),
  projects: requireDbId('PROJECTS'),
  timeline: requireDbId('TIMELINE'),
  experience: requireDbId('EXPERIENCE'),
};

// Vite proxies /api/database/* to the VPS at the server level, so the browser
// only ever sees localhost URLs. We match either form.
function collectNotionRequests(page: Page) {
  const hits: string[] = [];
  page.on('request', (req: Request) => {
    const url = req.url();
    if (url.startsWith(CACHE_BASE) || url.includes('/api/database/')) {
      hits.push(url);
    }
  });
  return hits;
}

// ── Home / About ──────────────────────────────────────────────────────────────

test('Home page loads and fetches About from Notion cache', async ({ page }) => {
  const requests = collectNotionRequests(page);

  // Register waitForRequest BEFORE goto so it catches the request during page load
  const [,] = await Promise.all([
    page.waitForRequest(
      req => req.url().includes(`/api/database/${DB_IDS.about}`),
      { timeout: 15_000 },
    ),
    page.goto('/'),
  ]);

  await expect(page).toHaveTitle(/sarvin|portfolio/i);
  await expect(page.locator('#hero')).toBeVisible();
  expect(requests.some(u => u.includes(DB_IDS.about))).toBe(true);
});

// ── Projects ──────────────────────────────────────────────────────────────────

test('Projects page loads and fetches Projects from Notion cache', async ({ page }) => {
  const requests = collectNotionRequests(page);

  await page.goto('/projects');

  // Loading indicator disappears
  await expect(page.getByText('$ loading...')).toBeHidden({ timeout: 15_000 });

  // At least one project card rendered
  const cards = page.locator('article');
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  // Category filter tabs present
  await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();

  // Network request hit the right DB
  expect(requests.some(u => u.includes(DB_IDS.projects))).toBe(true);
});

test('Projects category filter works', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByText('$ loading...')).toBeHidden({ timeout: 15_000 });

  // Click AI/ML filter
  await page.getByRole('tab', { name: 'AI/ML' }).click();
  await expect(page.getByRole('tab', { name: 'AI/ML' })).toHaveAttribute('aria-selected', 'true');

  // Toggle back to All
  await page.getByRole('tab', { name: 'All' }).click();
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
});

// ── My Journey (Timeline) ─────────────────────────────────────────────────────

test('My Journey page loads and fetches Timeline from Notion cache', async ({ page }) => {
  const requests = collectNotionRequests(page);

  await page.goto('/my-journey');

  await expect(page.getByText('$ loading...')).toBeHidden({ timeout: 15_000 });

  // At least one timeline card. The terminal-chrome redesign replaced the
  // <article> cards with expandable divs, so match the interactive role.
  const cards = page.locator('[role="button"][aria-expanded]');
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  expect(requests.some(u => u.includes(DB_IDS.timeline))).toBe(true);
});

// ── Experience ────────────────────────────────────────────────────────────────

test('Experience page loads and fetches Experience from Notion cache', async ({ page }) => {
  const requests = collectNotionRequests(page);

  await page.goto('/experience');

  await expect(page.getByText('$ loading...')).toBeHidden({ timeout: 15_000 });

  // At least one experience card
  const cards = page.locator('article');
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  expect(requests.some(u => u.includes(DB_IDS.experience))).toBe(true);
});

// ── Notion cache API health ───────────────────────────────────────────────────

test('All four Notion cache endpoints return 200 with results array', async ({ request }) => {
  for (const [name, id] of Object.entries(DB_IDS)) {
    const res = await request.get(`${CACHE_BASE}/api/database/${id}`);
    expect(res.status(), `${name} endpoint status`).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.results), `${name} has results array`).toBe(true);
    expect(body.results.length, `${name} returns at least 1 record`).toBeGreaterThan(0);
  }
});

// ── Navigation ────────────────────────────────────────────────────────────────

test('Navbar links navigate between all pages', async ({ page }) => {
  await page.goto('/');

  const nav = page.locator('nav[aria-label="Main navigation"]');

  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/\/projects/);

  await nav.getByRole('link', { name: 'My Journey' }).click();
  await expect(page).toHaveURL(/\/my-journey/);

  await nav.getByRole('link', { name: 'Experience' }).click();
  await expect(page).toHaveURL(/\/experience/);
});
