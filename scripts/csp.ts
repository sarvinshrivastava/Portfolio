import { createHash } from 'node:crypto';

/**
 * The theme script is inline in index.html (an external file would be a
 * render-blocking request) and CSP allows it by hash, not by 'unsafe-inline'.
 * A hash that no longer matches makes the browser drop the script silently, so
 * every light-theme visitor would get a dark flash and nothing would say why.
 *
 * Netlify only runs `bun run build`, never the tests, so this check runs inside
 * the build (the `seo()` plugin) and fails it with the hash to paste.
 *
 * Kept outside src/ because it needs node:crypto, which the app tsconfig lacks.
 */

/** Body of the only attribute-less <script> in the template: the theme script. */
export function inlineThemeScript(html: string): string {
  // Comments first: index.html's comments mention "<script>" in prose.
  const markup = html.replace(/<!--[\s\S]*?-->/g, '');
  const bodies = [...markup.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (bodies.length !== 1) {
    throw new Error(`csp: expected exactly 1 inline theme <script>, found ${bodies.length}`);
  }
  return bodies[0];
}

export function sha256Source(body: string): string {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
}

/**
 * The script-src directive of every CSP header block in netlify.toml (they
 * must all agree). A `script-src-elem` would take precedence for <script>
 * elements and silently bypass this check, so it is refused outright.
 */
export function scriptSrc(toml: string): string {
  const policies = [...toml.matchAll(/Content-Security-Policy\s*=\s*"([^"]*)"/g)].map(m => m[1]);
  if (policies.length === 0) throw new Error('csp: no Content-Security-Policy in netlify.toml');
  const sources = policies.map(csp => {
    const directives = csp.split(';').map(d => d.trim());
    if (directives.some(d => d.startsWith('script-src-elem'))) {
      throw new Error('csp: script-src-elem overrides script-src for <script>; extend this check first');
    }
    const directive = directives.find(d => d.startsWith('script-src '));
    if (!directive) throw new Error('csp: a Content-Security-Policy has no script-src directive');
    return directive.slice('script-src '.length).trim();
  });
  if (new Set(sources).size > 1) {
    throw new Error(`csp: Content-Security-Policy blocks disagree on script-src: ${sources.join(' | ')}`);
  }
  return sources[0];
}

/** Throws unless script-src is exactly 'self' plus the theme script's hash. */
export function assertThemeHash(html: string, toml: string): void {
  const expected = `'self' ${sha256Source(inlineThemeScript(html))}`;
  const actual = scriptSrc(toml);
  if (actual !== expected) {
    throw new Error(
      `csp: netlify.toml script-src is "${actual}" but the inline theme script needs "${expected}". ` +
        'Paste the expected value into the Content-Security-Policy header in netlify.toml.',
    );
  }
}
