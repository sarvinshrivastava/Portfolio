// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, themeVars, type ThemeName } from '../support/css';

const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');

describe('--focus-ring contrast (WCAG 1.4.11 non-text, >= 3:1)', () => {
  for (const theme of ['dark', 'light'] as ThemeName[]) {
    for (const surface of ['--bg', '--bg-secondary', '--bg-tertiary']) {
      it(`${theme}: against ${surface}`, () => {
        const vars = themeVars(css, theme);
        expect(vars['--focus-ring']).toBeDefined();
        expect(contrast(vars['--focus-ring'], vars[surface])).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('applies the ring to :focus-visible', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--focus-ring\)/);
  });
});
