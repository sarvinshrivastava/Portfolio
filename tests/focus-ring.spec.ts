import { test, expect, type Page } from '@playwright/test';

/**
 * Browser-only check for the "ring after a mouse click" bug: jsdom has no
 * :focus-visible heuristic, so it cannot tell a click-focus from a Tab-focus.
 * Real clicks and key presses go through Chromium's own heuristic here.
 */

test.use({ viewport: { width: 1280, height: 800 } });

const PROJECTS_TAB = 'header nav ul a[href="/projects"]';
const LAST_TAB = 'header nav ul a[href="/experience"]';

async function headerFocusVisibleCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('header :focus-visible').length);
}

test('no header ring after a mouse click followed by a keyboard shortcut', async ({ page }) => {
  await page.goto('/');
  await page.click(PROJECTS_TAB);
  await page.waitForURL('**/projects');

  let previous: string | undefined;
  for (const key of ['ArrowDown', 'd', 'h', 'k', '/', 'Escape']) {
    // Undo the side effect of the previous key before re-clicking the tab.
    if (previous === 'd') await page.keyboard.press('d');
    if (previous === 'h') await page.keyboard.press('Escape');
    previous = key;

    await page.click(PROJECTS_TAB);
    await page.keyboard.press(key);

    expect(await headerFocusVisibleCount(page), `header :focus-visible after key "${key}"`).toBe(0);
  }
});

test('no header ring after clicking the last tab and pressing ArrowRight', async ({ page }) => {
  await page.goto('/');
  await page.click(LAST_TAB);
  await page.waitForURL('**/experience');

  await page.keyboard.press('ArrowRight');

  expect(await headerFocusVisibleCount(page), 'header :focus-visible after key "ArrowRight"').toBe(0);
});

test('keyboard users keep the focus ring', async ({ page }) => {
  await page.goto('/');

  let inHeader = false;
  for (let i = 0; i < 30 && !inHeader; i++) {
    await page.keyboard.press('Tab');
    inHeader = await page.evaluate(() => !!document.activeElement?.closest('header'));
  }
  expect(inHeader, 'Tab reached an element inside header').toBe(true);

  const state = await page.evaluate(() => {
    const el = document.activeElement as Element;
    const cs = getComputedStyle(el);
    return {
      focusVisible: el.matches(':focus-visible'),
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
    };
  });
  expect(state.focusVisible).toBe(true);
  expect(state.outlineStyle).toBe('solid');
});

test('projects page has no "featured" badge text and no tab roles', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByText('$ loading...')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('main article').first()).toBeVisible({ timeout: 15_000 });

  await expect(page.locator('main article').getByText('featured', { exact: true })).toHaveCount(0);
  await expect(page.locator('[role="tab"]')).toHaveCount(0);
});
