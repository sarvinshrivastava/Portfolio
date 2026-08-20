# `VITE_` env vars are public — they are inlined into the bundle

## The mechanism

Vite does a **static text replacement** of `import.meta.env.VITE_*` at build time.
The value never travels as a runtime lookup; it ends up as a literal in
`dist/assets/index-*.js`.

```ts
// src/services/notion.ts
about: import.meta.env.VITE_NOTION_DB_ABOUT ?? '',
```

becomes, after `vite build`:

```js
about: "9ffc9aed7f2444018df81807060aab3e"
```

Verify on any build:

```bash
grep -l "<the-value>" dist/assets/*.js   # match ⇒ it is public
```

## Consequences

- Anything named `VITE_*` is readable by every visitor via DevTools. Only the
  `VITE_` prefix is exposed, but that is exactly the set the app can read — so
  **a browser-readable config value and a secret are mutually exclusive**.
- Never put an API key, token, or private id behind `VITE_`. If the browser needs
  it, it needs a server proxy instead.
- Redacting such a value in *other* systems' logs is hygiene, not
  confidentiality. Do not build a security claim on top of it. Real protection
  for an endpoint has to live on the server: rate limiting, origin allowlist,
  auth.
- Corollary for docs: a value stored as a GitHub Actions secret is not thereby
  secret. Actions storing it says nothing about whether it is already public
  elsewhere.

## Related: how Playwright reads the same values

Playwright runs in Node, so `import.meta.env` does not exist and it does **not**
read the env file on its own. Rather than duplicating ids into the spec, load
them in `playwright.config.ts` with Vite's own loader, letting a real process env
var win so CI can override without a file:

```ts
import { loadEnv } from 'vite';

for (const [key, value] of Object.entries(loadEnv('development', process.cwd(), 'VITE_'))) {
  process.env[key] ??= value;
}
```

Then fail loudly at collection time instead of producing a URL with `undefined`
in it:

```ts
function requireDbId(name: string): string {
  const key = `VITE_NOTION_DB_${name}`;
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set. ...`);
  return value;
}
```

Gotchas found doing this:

- `process.env[key] ??= value` is deliberate. `??=` treats `''` as *set*, so an
  explicitly-empty override still reaches `requireDbId` and trips the loud error
  rather than being silently replaced by the file value.
- `bunx playwright test --list` is the cheap check — it evaluates the spec module
  (so the env wiring is exercised) without running a browser.
- The config's `webServer.command` and the specs' `CACHE_BASE` hostname stay
  literals: hostnames really are public in the bundle.
