import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), umami()],
  server: {
    proxy: {
      '/api/database': 'https://notion-cache.vps.sarvinshrivastava.space',
      '/api/pages': 'https://notion-cache.vps.sarvinshrivastava.space',
    },
  },
});
