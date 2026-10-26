import { test, expect, type Page } from '@playwright/test';
import { snapshotBody } from './support/notionHarness';

/**
 * End to end for the saved-data fallback and the resume availability probe.
 * Never touches the real notion-cache: every dataset request answers 429, the
 * build snapshot and /resume.pdf are served from fixtures. The dev server
 * (playwright.config.ts) requests the datasets at /api/database/<id>, the
 * snapshot at /data/snapshot.json and the probe as HEAD /resume.pdf.
 */

test.use({ viewport: { width: 1280, height: 800 } });

const TAG = 'Saved Fixture';

async function stubOffline(page: Page, resume: { status: number; contentType: string }) {
  await page.route('**/api/database/**', route =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'rate_limited' }),
    }),
  );
  await page.route('**/data/snapshot.json', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshotBody(new Date().toISOString(), TAG)),
    }),
  );
  await page.route('**/resume.pdf', route =>
    route.fulfill({ status: resume.status, contentType: resume.contentType, body: '%PDF-1.4' }),
  );
}

test('serves the snapshot as one set, announces it, and keeps the cv link', async ({ page }) => {
  await stubOffline(page, { status: 200, contentType: 'application/pdf' });
  await page.goto('/projects');

  await expect(page.locator('article').first()).toContainText(TAG);

  const status = page.getByRole('status');
  await expect(status).toContainText('rate limit reached');
  await expect(status).toContainText('showing saved data');
  await expect(page.getByRole('link', { name: /cv/ })).toBeVisible();

  // Client-side navigation keeps showing the same saved set (no live/saved mix).
  await page.locator('header nav ul a[href="/experience"]').click();
  await expect(page.locator('article').first()).toContainText('New Co');

  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('button', { name: 'Dismiss' })).toHaveCount(0);
  await expect(status).toHaveText('');
});

test('hides the cv link when /resume.pdf answers 503', async ({ page }) => {
  await stubOffline(page, { status: 503, contentType: 'text/plain' });
  const probed = page.waitForRequest(r => new URL(r.url()).pathname === '/resume.pdf');
  await page.goto('/');
  await probed;

  await expect(page.getByRole('link', { name: /cv/ })).toHaveCount(0);
});
