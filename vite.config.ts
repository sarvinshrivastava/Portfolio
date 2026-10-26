import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { HOME_ROUTE, SEO_ROUTES, renderRouteHtml, seoRouteFor } from './src/seo/site';
import { assertThemeHash } from './scripts/csp';
import { fetchSnapshot } from './scripts/snapshot';

/** Next to this file, not process.cwd(), so builds started elsewhere check the right one. */
const NETLIFY_TOML = fileURLToPath(new URL('./netlify.toml', import.meta.url));

/**
 * The tracker is VENDORED at public/umami.js and served from our own origin, so
 * a compromise of the umami VPS cannot inject arbitrary JS into this origin
 * (the contact form lives here). Collection still goes to the VPS via
 * `data-host-url` — the tracker builds its endpoint as `${host-url}/api/send`
 * and only falls back to its own script directory when the attribute is absent.
 * Re-download public/umami.js whenever the umami server is upgraded; see
 * learnings/umami-analytics.md for the exact curl command.
 */
const UMAMI_SRC = '/umami.js';
const UMAMI_HOST = 'https://umami.vps.sarvinshrivastava.space';
const UMAMI_WEBSITE_ID = '3ff0e349-cf10-49df-97ab-90ca243b755b';

/**
 * Injects the self-hosted umami tracker into index.html.
 *
 * The gate has to match `import.meta.env.PROD` in src/lib/analytics.ts exactly,
 * and it must ALSO keep non-production Netlify deploys out of the production
 * website id. `apply: 'build'` alone did neither:
 *   - `vite build --mode development` injected the tracker while `PROD` was
 *     false, so auto-pageviews reached production while every custom event was
 *     silently dropped;
 *   - Netlify deploy-previews and branch-deploys reported into the production
 *     website id.
 * Hence the predicate below. `CONTEXT` is set by Netlify to
 * `production` | `deploy-preview` | `branch-deploy`; defaulting it to
 * `production` keeps a local `bun run build && bun run preview` working.
 */
function umami(): Plugin {
  return {
    name: 'inject-umami',
    apply: (_, env) =>
      env.command === 'build' &&
      env.mode === 'production' &&
      (process.env.CONTEXT ?? 'production') === 'production',
    transformIndexHtml: () => [
      {
        // Warm the TCP+TLS handshake to the collection origin. Injected from
        // the same plugin so there is exactly one gate for all analytics tags.
        // `crossorigin` (anonymous) matches the tracker's own credential-less
        // POST, otherwise the browser opens a second connection anyway.
        tag: 'link',
        attrs: { rel: 'preconnect', href: UMAMI_HOST, crossorigin: '' },
        injectTo: 'head',
      },
      {
        tag: 'script',
        attrs: {
          defer: true,
          src: UMAMI_SRC,
          'data-website-id': UMAMI_WEBSITE_ID,
          // Where the collected data goes, now that the script itself is local.
          'data-host-url': UMAMI_HOST,
          // These four are opt-in and the tracker tests them with
          // `=== 'true'`, so they MUST be the literal string. Vite renders
          // `attr: true` as a bare valueless attribute, which reads back as ''
          // and silently does nothing.
          //
          // Inbound links carry PII and ad junk (`/?email=a@b.com`, `?gclid=…`)
          // that umami would otherwise persist verbatim next to every pageview.
          'data-exclude-search': 'true',
          'data-exclude-hash': 'true',
          // Honour the browser's Do Not Track signal.
          'data-do-not-track': 'true',
          // Core Web Vitals (fcp/lcp/inp/cls) as a `performance` event. Without
          // this attribute the tracker sends none.
          'data-performance': 'true',
        },
        injectTo: 'head',
      },
    ],
  };
}

/**
 * Writes one HTML file per route with its own <head> and a static shell inside
 * #root, so crawlers that never run JS still see the page (see src/seo/site.ts
 * and learnings/spa-seo-static-shell.md).
 *
 * Build: works in `generateBundle` on the FINAL index.html, which vite:build-html
 * emits in its own generateBundle; `enforce: 'post'` is what puts this hook after
 * it. Every route file is therefore a copy of the same asset tags and the same
 * umami injection, under the umami plugin's single gate. Files are flat
 * (`projects.html`): Netlify serves them at `/projects` with no trailing-slash
 * redirect, and the `/*` SPA rewrite does not shadow a file that exists.
 *
 * Dev: `transformIndexHtml` renders the requested route so `vite dev` shows the
 * same shell. It returns early in build, where generateBundle owns the markers;
 * a plugin-level `apply` would have dropped generateBundle too.
 */
export function seo({ netlifyToml = NETLIFY_TOML }: { netlifyToml?: string } = {}): Plugin {
  return {
    name: 'seo-static-shell',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html;
      const pathname = new URL(ctx.originalUrl ?? '/', 'http://localhost').pathname;
      return renderRouteHtml(html, seoRouteFor(pathname) ?? HOME_ROUTE);
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') this.error('seo: index.html is not in the bundle');
      if (HOME_ROUTE.file !== index.fileName) {
        this.error(`seo: HOME_ROUTE.file is ${HOME_ROUTE.file}, bundle has ${index.fileName}`);
      }
      const template = String(index.source);
      // Netlify never runs the tests, so a stale CSP hash must fail the build.
      try {
        assertThemeHash(template, readFileSync(netlifyToml, 'utf8'));
      } catch (err) {
        this.error((err as Error).message);
      }
      for (const route of SEO_ROUTES) {
        if (route === HOME_ROUTE) continue;
        if (route.file === index.fileName) this.error(`seo: ${route.path} would overwrite index.html`);
        this.emitFile({
          type: 'asset',
          fileName: route.file,
          source: renderRouteHtml(template, route),
        });
      }
      index.source = renderRouteHtml(template, HOME_ROUTE);
    },
  };
}

/**
 * Emits dist/data/snapshot.json: the four Notion datasets as of this build, the
 * site's fallback when the live notion-cache is down or rate-limited. A build
 * that cannot fetch it fails, so a deploy never ships without a fallback.
 *
 * Runs on Netlify (`NETLIFY=true`) or when `SNAPSHOT=1`; a plain local build
 * skips it, so `bun run build` and the tests need no network. `VITE_*` values
 * come from `configResolved`, which already merged the env files and
 * Netlify's environment.
 */
function snapshot(): Plugin {
  let viteEnv: Record<string, string> = {};
  return {
    name: 'notion-snapshot',
    apply: 'build',
    configResolved(config) {
      viteEnv = config.env;
    },
    async generateBundle() {
      if (process.env.NETLIFY !== 'true' && process.env.SNAPSHOT !== '1') {
        this.warn('snapshot skipped (set SNAPSHOT=1 to enable)');
        return;
      }
      try {
        const s = await fetchSnapshot({
          base: viteEnv.VITE_NOTION_CACHE_URL ?? '',
          ids: {
            about: viteEnv.VITE_NOTION_DB_ABOUT ?? '',
            projects: viteEnv.VITE_NOTION_DB_PROJECTS ?? '',
            timeline: viteEnv.VITE_NOTION_DB_TIMELINE ?? '',
            experience: viteEnv.VITE_NOTION_DB_EXPERIENCE ?? '',
          },
        });
        this.emitFile({ type: 'asset', fileName: 'data/snapshot.json', source: JSON.stringify(s) });
      } catch (err) {
        this.error((err as Error).message);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), umami(), seo(), snapshot()],
  server: {
    proxy: {
      '/api/database': 'https://notion-cache.vps.sarvinshrivastava.space',
      '/api/pages': 'https://notion-cache.vps.sarvinshrivastava.space',
    },
  },
});
