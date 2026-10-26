// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, lastContainerMaxWidth, themeVars, type ThemeName } from '../support/css';

const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');

describe('design tokens (A10)', () => {
  it('defines --radius on :root so both themes get it', () => {
    expect(css).toMatch(/:root\s*\{[^}]*--radius:\s*4px;/);
  });

  it('sets the muted text values', () => {
    expect(themeVars(css, 'dark')['--text-muted']).toBe('#8a8a8a');
    expect(themeVars(css, 'light')['--text-muted']).toBe('#636363');
  });

  for (const theme of ['dark', 'light'] as ThemeName[]) {
    for (const surface of ['--bg', '--bg-secondary', '--bg-tertiary']) {
      it(`${theme}: --text-muted against ${surface} is at least 4.5:1`, () => {
        const vars = themeVars(css, theme);
        expect(contrast(vars['--text-muted'], vars[surface])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('declares the container as a Tailwind @utility, not a components-layer class', () => {
    expect(css).toMatch(/@utility container\s*\{[^}]*max-width:\s*1200px/);
    expect(css).not.toMatch(/@layer components\s*\{\s*\.container/);
  });
});

describe('lastContainerMaxWidth', () => {
  it('returns the last max-width declared for .container', () => {
    const ok = '.container{width:100%}@media (min-width:96rem){.container{max-width:96rem}}.container{max-width:1200px;margin-inline:auto}';
    expect(lastContainerMaxWidth(ok)).toBe('1200px');
  });

  it('can fail: a fixture ending in 96rem gives 96rem', () => {
    const bad = '.container{max-width:1200px}@media (min-width:96rem){.container{max-width:96rem}}';
    expect(lastContainerMaxWidth(bad)).toBe('96rem');
  });

  it('ignores other selectors and returns undefined when there is none', () => {
    expect(lastContainerMaxWidth('.page{max-width:10px}')).toBeUndefined();
  });
});
