/** Helpers for tests that read `src/index.css` and check design tokens. */

export type ThemeName = 'dark' | 'light';

/** Custom properties declared in the `[data-theme='<theme>']` block. */
export function themeVars(css: string, theme: ThemeName): Record<string, string> {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(css);
  if (!block) throw new Error(`no [data-theme='${theme}'] block in css`);
  const vars: Record<string, string> = {};
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG 2.x contrast ratio between two 6-digit hex colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The `max-width` of the last `.container { … }` rule in built CSS, in source
 * order, or undefined. Tailwind's built-in container utility emits 40rem..96rem
 * breakpoint rules; our `@utility container` must come after them.
 */
export function lastContainerMaxWidth(css: string): string | undefined {
  let last: string | undefined;
  for (const rule of css.matchAll(/\.container\s*\{([^}]*)\}/g)) {
    const width = /(?:^|;)\s*max-width\s*:\s*([^;]+?)\s*(?:;|$)/.exec(rule[1]);
    if (width) last = width[1];
  }
  return last;
}
