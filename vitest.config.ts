import { defineConfig } from 'vitest/config';

/**
 * Deliberately NOT merged into vite.config.ts: that file owns the production
 * build (including the umami script injection) and adding a `test` block there
 * would make every `vite build` load the vitest config chain.
 *
 * `globals: false` — every test imports describe/it/expect/vi explicitly, so a
 * spec file is readable on its own and `tsc -b` needs no ambient globals.
 *
 * Default environment is jsdom; the pure-node specs opt out with a
 * `// @vitest-environment node` docblock at the top of the file.
 *
 * `include` matches only *.test.ts(x) so the Playwright suite living in the
 * same tests/ directory (tests/notion-cache.spec.ts) is never picked up here.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
