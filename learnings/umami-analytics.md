# Umami analytics in this portfolio

Self-hosted umami at `https://umami.vps.sarvinshrivastava.space`, website id
`3ff0e349-cf10-49df-97ab-90ca243b755b`. Custom events go through
`src/lib/analytics.ts`; nothing calls `window.umami` directly.

## What the tracker does for free — don't hand-roll it

- The script **patches `history.pushState` / `replaceState`**, so react-router
  route changes are recorded as pageviews with no code. There is no need for a
  `useEffect` that fires a manual pageview on `location.pathname`; doing that
  double-counts.
- It can send a separate `performance` event carrying **web vitals**
  (fcp, lcp, inp, cls) on `visibilitychange` / `pagehide` — but **only when the
  tag carries `data-performance="true"`**. This doc used to claim the events
  arrived for free; they did not, because the tag omitted the attribute. The tag
  now sets it.
- **Opt-in attributes must be the literal string `"true"`.** The minified
  tracker tests them with `w("performance") === "true"`, so a valueless
  attribute (`data-performance`, which reads back as `''`) is a silent no-op.
  This matters in `vite.config.ts`: Vite's `transformIndexHtml` renders
  `attrs: { 'data-performance': true }` as a bare attribute, so the value has to
  be written as the string `'true'`. Same for `data-exclude-search`,
  `data-exclude-hash` and `data-do-not-track`. (`data-auto-track` is the
  inverse — it tests `!== "false"` — so it is on unless disabled.)
- API surface is only `umami.track(name, data)`, `umami.identify(data)`,
  `umami.getSession()`. `getSession()` returning a `cache` JWT is a cheap way to
  confirm the tracker handshook with the server.

## The script tag is injected at BUILD time, not written in index.html

`vite.config.ts` has an `inject-umami` plugin whose `apply` is a predicate, not
the string `'build'`. `src/lib/analytics.ts` gates every event on
`import.meta.env.PROD`, and the injection gate has to agree with it:

```ts
apply: (_, env) =>
  env.command === 'build' &&
  env.mode === 'production' &&
  (process.env.CONTEXT ?? 'production') === 'production',
```

**`apply: 'build'` was wrong on two counts** and both failure modes were silent:

- It keys on the *command* only. `vite build --mode development` injected the
  tracker while `import.meta.env.PROD` was **false** — so auto-pageviews landed
  in the production dashboard while every custom event was suppressed. The two
  gates did not "stay in step" the way the old comment claimed; only
  `env.mode === 'production'` actually ties them together.
- Netlify runs the same production build for previews. Every deploy-preview and
  branch-deploy reported into the production website id. `CONTEXT` is the
  Netlify-set variable (`production` | `deploy-preview` | `branch-deploy`); the
  `?? 'production'` default is what keeps a local
  `bun run build && bun run preview` still emitting events.

Consequence for testing: **`vite dev` can never emit an event.** To verify
anything end-to-end you must `bun run build && bun run preview` — `PROD` is
replaced at build time, so the preview server behaves like production.

Alternative rejected: umami's own `data-domains` attribute. It works, but it
hardcodes the production hostname in the tag and silently disables tracking if
the domain ever changes.

## `public/umami.js` is a VENDORED copy — re-download it on every server upgrade

The tag loads `/umami.js` from **our own origin**, not from the VPS. Only the
collected data leaves, via `data-host-url`.

Why: loading `script.js` straight from the VPS meant one compromised box could
serve arbitrary JavaScript into this origin. The highest-value target here is
the contact form — injected script could read a visitor's name, email and
message, exactly the PII this analytics setup was designed never to collect. A
single self-hosted server is a much softer target than a static CDN, and the
tracker changes maybe twice a year, so pinning a reviewed copy costs nothing.

**This file is a snapshot and does not update itself.** Whenever the umami
server is upgraded, re-download it:

```bash
curl -fsSL https://umami.vps.sarvinshrivastava.space/script.js -o public/umami.js
```

Then sanity-check it before committing — a proxy error page or a login redirect
also returns 200 and would disable analytics with no visible symptom:

```bash
wc -c public/umami.js        # ~4.7 KB minified
grep -c '/api/send' public/umami.js   # must be 1
grep -ci '<html' public/umami.js      # must be 0
```

Snapshot in the repo: 4733 bytes, `Last-Modified: 2026-08-12`,
sha256 `f7466a453d625adbdfa6a7c61d8b8c272e9270781e3c9737fbc0780ea11bb807`.

The endpoint is derived as `` `${host-url}/api/send` ``, falling back to the
script's own directory when `data-host-url` is absent — which is precisely why
vendoring **requires** that attribute, or the tracker would POST to
`https://<our-site>/api/send` and 404 silently. Nothing else about collection
changes: the POST was always cross-origin (CORS is keyed on the *page's* origin,
never the script's), and `/api/send` answers preflights with
`Access-Control-Allow-Origin: *`.

## Content-Security-Policy (netlify.toml)

Vendoring is what makes `script-src 'self'` possible; the CSP block in
`netlify.toml` is the other half of the same fix and the two must be changed
together. Two non-obvious constraints found while writing it:

- `style-src` needs `https://fonts.googleapis.com`. `src/index.css` opens with
  `@import url('https://fonts.googleapis.com/css2?…')`, and Vite keeps remote
  `@import` rules in the emitted CSS instead of inlining them. The woff2 files
  come from a *different* host, so `font-src` needs `https://fonts.gstatic.com`.
- `img-src` must stay `https:`-wide. Project images come from the Notion
  `Image URL` property (`src/services/notion.ts`) and can be any host.

## Route changes preserve scroll position — it fakes scroll depth

This app renders no `<ScrollRestoration>`, so a client-side navigation keeps the
window's scroll offset (clamped to the new page's height). Measured: scrolled to
1880px on `/`, clicked through to `/experience`, landed at 181px of a 182px
scrollable — i.e. **99% depth on arrival, having read nothing**. The browser's
clamping scroll event then credits every threshold at once.

`useScrollDepth` therefore takes an arrival **baseline** (measured in a
`requestAnimationFrame` after the route paints) and ignores every threshold at or
below it. Only depth the visitor deliberately scrolls past is reported.

Also: depth is a fraction of the **scrollable distance**, not of total page
height. Using total height reports 50% instantly on a two-viewport page.

## Event conventions

- `snake_case` names, defined once in the `EventPayloads` map in
  `src/lib/analytics.ts`. The map is what makes a name callable — `track()`
  rejects unknown names and wrong property shapes at compile time.
- Prefer **one event with dimensions** over many near-identical names:
  `social_click { network, location }`, not `github_click_footer`.
- `trackOnce(key, ...)` dedupes per page session for anything that would
  otherwise repeat (form start, scroll thresholds). The `Set` is module state and
  does **not** reset on route change — put the path in the key when an event
  should be able to fire again on another route.
- Suppress no-op interactions: re-clicking an already-active project filter and
  collapsing a journey commit deliberately send nothing.

## Privacy rule

No visitor-typed text ever becomes a property. `contact_validation_error` sends
the field **name** and our own validation message; it never sends what was typed.
`contact_form_error` maps the EmailJS rejection to `emailjs_<status>` — EmailJS's
`text` is its own diagnostic ("The Public Key is invalid"), not user input.

## Health events beat silence

`data_load_error { dataset, status }` fires in `services/notion.ts` before every
throw. A dead Notion cache renders as a **silently empty site** that pageview
counts look perfectly healthy for. Synthetic statuses: `0` = DB id missing from
the build, `-1` = request never reached the cache (offline, DNS, CORS).

## Gotchas hit while verifying

- Running `preview` with `VITE_NOTION_CACHE_URL` pointed straight at the VPS
  fails CORS from `localhost` — the dev proxy in `vite.config.ts` only covers
  `vite dev`. Leave the var unset locally so fetches stay relative. (This is
  what produced a real `data_load_error status: -1` during verification.)
- Events sent from a local preview arrive with `x-umami-hostname: localhost`, so
  test hits are trivially separable from real traffic in the dashboard.
- Netlify now builds with `bun run build` against the committed `bun.lock`
  (`package-lock.json` was deleted). Previously the repo developed against
  bun-resolved dependencies and deployed against npm-resolved ones. Note
  `.npmrc`'s `legacy-peer-deps=true` is an npm-only setting that bun ignores —
  bun does not hard-fail on peer conflicts, so it is inert rather than a risk.
- `tests/notion-cache.spec.ts:81` (My Journey) asserts an `<article>` element
  that the terminal-chrome redesign removed — it has been failing since then,
  unrelated to analytics.
- The repo has no prettier dependency but a global editor hook runs prettier on
  save, and its defaults (double quotes, 80 cols) restyled every touched file.
  `.prettierrc` now pins `singleQuote`, `printWidth: 100`, `arrowParens: avoid`
  to match the code that was already here.
