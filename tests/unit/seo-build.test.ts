// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { build } from 'vite';
import { SEO_ROUTES, canonicalUrl } from '../../src/seo/site';
import { assertThemeHash } from '../../scripts/csp';
import { seo } from '../../vite.config';
import {
  aboutPages,
  experiencePages,
  projectPages,
  timelinePages,
} from '../support/notionFixtures';

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
const toml = readFileSync(resolve(root, 'netlify.toml'), 'utf8');
const outDirs: string[] = [];

async function buildTo(context?: string, mode?: string): Promise<(file: string) => string> {
  if (context) vi.stubEnv('CONTEXT', context);
  const outDir = mkdtempSync(join(tmpdir(), 'seo-build-'));
  outDirs.push(outDir);
  await build({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'silent',
    ...(mode ? { mode } : {}),
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
      // The theme script is the first script in the file and runs before the
      // stylesheet paints anything.
      const markup = html.replace(/<!--[\s\S]*?-->/g, ''); // comments mention "<script>"
      expect(markup.indexOf('<script')).toBe(markup.indexOf('<script>'));
      expect(markup.indexOf('<script>')).toBeLessThan(markup.indexOf('<link rel="stylesheet"'));
      // CSP has no 'unsafe-inline': the only scripts without a src are the
      // hashed theme script and the non-executed JSON-LD data block, and the
      // hash in netlify.toml matches this file's bytes exactly.
      const inline = [...markup.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)].map(m => m[1].trim());
      expect(inline.sort()).toEqual(['', 'type="application/ld+json"']);
      expect(() => assertThemeHash(html, toml)).not.toThrow();
    }
    expect(() => read('theme.js')).toThrow(/ENOENT/);
  }, 60_000);

  it('fails the build when netlify.toml carries a stale theme hash', async () => {
    // Netlify runs only `bun run build`, so this is the guard that matters.
    const outDir = mkdtempSync(join(tmpdir(), 'seo-build-'));
    outDirs.push(outDir);
    const stale = join(outDir, 'netlify.toml');
    writeFileSync(stale, toml.replace(/'sha256-[A-Za-z0-9+/]+=*'/, "'sha256-stale='"));
    await expect(
      build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [seo({ netlifyToml: stale })],
        build: { outDir: join(outDir, 'dist'), emptyOutDir: true },
      }),
    ).rejects.toThrow(/csp: netlify.toml script-src is .* but the inline theme script needs/);
  }, 60_000);

  it('keeps umami out of every route file on preview deploys', async () => {
    const read = await buildTo('deploy-preview');
    for (const route of SEO_ROUTES) {
      expect(read(route.file)).not.toContain('<script defer src="/umami.js"');
    }
  }, 60_000);

  it('keeps umami and its preconnect out of every route file in a development-mode build', async () => {
    const read = await buildTo('production', 'development');
    for (const route of SEO_ROUTES) {
      const html = read(route.file);
      expect(html, route.file).not.toContain('<script defer src="/umami.js"');
      expect(html, route.file).not.toContain('umami.vps.sarvinshrivastava.space');
    }
  }, 60_000);

  describe('snapshot plugin', () => {
    const DB_IDS = { ABOUT: 'ida', PROJECTS: 'idp', TIMELINE: 'idt', EXPERIENCE: 'ide' };

    function stubEnv(flags: { NETLIFY?: string; SNAPSHOT?: string }) {
      vi.stubEnv('NETLIFY', flags.NETLIFY ?? '');
      vi.stubEnv('SNAPSHOT', flags.SNAPSHOT ?? '');
      vi.stubEnv('VITE_NOTION_CACHE_URL', 'https://x.test');
      for (const [k, v] of Object.entries(DB_IDS)) vi.stubEnv(`VITE_NOTION_DB_${k}`, v);
    }

    it('emits no data/snapshot.json when neither flag is set', async () => {
      stubEnv({});
      const read = await buildTo('production');
      expect(() => read('data/snapshot.json')).toThrow(/ENOENT/);
    }, 60_000);

    it('emits data/snapshot.json with v:1 under SNAPSHOT=1', async () => {
      stubEnv({ SNAPSHOT: '1' });
      const byId: Record<string, unknown> = {
        ida: aboutPages(),
        idp: projectPages,
        idt: timelinePages,
        ide: experiencePages,
      };
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          const id = String(url).split('/').pop() as string;
          return new Response(JSON.stringify({ results: byId[id] }), { status: 200 });
        }),
      );
      const read = await buildTo('production');
      const snap = JSON.parse(read('data/snapshot.json'));
      expect(snap.v).toBe(1);
      expect(snap.about.bio).toBe('hello');
      expect(snap.experience).toHaveLength(2);
    }, 60_000);

    it('emits data/snapshot.json on Netlify (NETLIFY=true) without SNAPSHOT', async () => {
      stubEnv({ NETLIFY: 'true' });
      const byId: Record<string, unknown> = {
        ida: aboutPages(),
        idp: projectPages,
        idt: timelinePages,
        ide: experiencePages,
      };
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          const id = String(url).split('/').pop() as string;
          return new Response(JSON.stringify({ results: byId[id] }), { status: 200 });
        }),
      );
      const read = await buildTo('production');
      expect(JSON.parse(read('data/snapshot.json')).v).toBe(1);
    }, 60_000);

    it('rejects the build under SNAPSHOT=1 when the cache answers 404', async () => {
      stubEnv({ SNAPSHOT: '1' });
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('', { status: 404 })),
      );
      await expect(buildTo('production')).rejects.toThrow(/snapshot: \w+ failed \(404\)/);
    }, 60_000);
  });
});
