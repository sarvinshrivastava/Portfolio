// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { build } from 'vite';
import { SEO_ROUTES, canonicalUrl } from '../../src/seo/site';

/**
 * Runs the real production build and checks what the seo plugin wrote. The
 * risky wiring (generateBundle ordering, emitFile, overwriting index.html, the
 * umami tag surviving in every route file) cannot be seen from unit tests.
 *
 * Vitest sets NODE_ENV=test, so this bundle is NOT a PROD bundle
 * (import.meta.env.PROD is false) even though `mode` stays 'production'. That
 * is fine: the umami gate in vite.config.ts keys on `mode` and CONTEXT, and only
 * the HTML is asserted here. Don't "fix" the PROD mismatch.
 */

const root = resolve(__dirname, '../..');
const outDirs: string[] = [];

async function buildTo(context?: string): Promise<(file: string) => string> {
  if (context) vi.stubEnv('CONTEXT', context);
  const outDir = mkdtempSync(join(tmpdir(), 'seo-build-'));
  outDirs.push(outDir);
  await build({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  });
  return file => readFileSync(join(outDir, file), 'utf8');
}

afterAll(() => {
  for (const dir of outDirs) rmSync(dir, { recursive: true, force: true });
});

describe('seo plugin build output', () => {
  it('writes every route with its own head, the app bundle and umami', async () => {
    const read = await buildTo('production');
    for (const route of SEO_ROUTES) {
      const html = read(route.file);
      expect(html.match(/<h1[\s>]/g), route.file).toHaveLength(1);
      expect(html).toContain(`<link rel="canonical" href="${canonicalUrl(route)}" />`);
      expect(html).toMatch(/<script type="module" crossorigin src="\/assets\/[^"]+\.js">/);
      expect(html).toContain('<script defer src="/umami.js"');
      expect(html).not.toContain('<!--seo:');
    }
  }, 60_000);

  it('keeps umami out of every route file on preview deploys', async () => {
    const read = await buildTo('deploy-preview');
    for (const route of SEO_ROUTES) {
      expect(read(route.file)).not.toContain('<script defer src="/umami.js"');
    }
  }, 60_000);
});
