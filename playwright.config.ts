import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

// Playwright does not read the env file on its own, and the Notion database
// ids are no longer hardcoded in the specs. Pull the VITE_ vars in here, but
// let a real process env var win so CI can override without an env file.
for (const [key, value] of Object.entries(loadEnv('development', process.cwd(), 'VITE_'))) {
  process.env[key] ??= value;
}

export default defineConfig({
  testDir: './tests',
  // Scope to .spec.ts — tests/unit/*.test.ts are vitest's, and Playwright's
  // default testMatch would collect them and die on vitest's internal state
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
