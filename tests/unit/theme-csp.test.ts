import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { assertThemeHash, inlineThemeScript, scriptSrc, sha256Source } from '../../scripts/csp';
import { useTheme } from '../../src/hooks/useTheme';

/**
 * The theme script is inline in index.html and allowed by CSP hash. Two things
 * can silently break: the hash drifting from the bytes (the browser then drops
 * the script, so light-theme visitors get a dark flash), and the script's logic
 * drifting from useTheme's initial state (the theme flips on mount).
 */

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const toml = readFileSync(resolve(root, 'netlify.toml'), 'utf8');
const body = inlineThemeScript(html);

describe('CSP hash guard', () => {
  it('passes for the committed index.html and netlify.toml', () => {
    expect(() => assertThemeHash(html, toml)).not.toThrow();
    expect(scriptSrc(toml)).toBe(`'self' ${sha256Source(body)}`);
  });

  it('fails on any byte change and prints the value to paste', () => {
    const edited = html.replace('var theme;', 'var  theme;');
    const expected = sha256Source(inlineThemeScript(edited));
    expect(() => assertThemeHash(edited, toml)).toThrow(expected);
  });

  it('rejects a hash without quotes, in another directive, or next to extras', () => {
    const good = sha256Source(body);
    const bare = toml.replace(good, good.slice(1, -1));
    const extra = toml.replace(good, `${good} 'unsafe-inline'`);
    const moved = toml
      .replace(` ${good}`, '')
      .replace("default-src 'self'", `default-src 'self' ${good}`);
    for (const bad of [bare, extra, moved]) expect(() => assertThemeHash(html, bad)).toThrow();
  });

  it('refuses script-src-elem, which would bypass the script-src check', () => {
    const elem = toml.replace("default-src 'self';", "default-src 'self'; script-src-elem 'self';");
    expect(() => assertThemeHash(html, elem)).toThrow(/script-src-elem/);
  });

  it('requires every CSP block to carry the same script-src', () => {
    const second = `${toml}\n[[headers]]\n  for = "/x"\n  [headers.values]\n    Content-Security-Policy = "script-src 'self'"\n`;
    expect(() => assertThemeHash(html, second)).toThrow(/disagree/);
  });
});

/** Minimal Storage: under this Node, neither global nor jsdom localStorage exists. */
function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('theme script matches useTheme', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  function prefersDark(dark: boolean) {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: dark && q.includes('dark') }));
  }

  /** What the inline script sets, then what useTheme starts with, in the same setup. */
  function both(): [string | null, string] {
    new Function(body)();
    const script = document.documentElement.getAttribute('data-theme');
    const { result } = renderHook(() => useTheme());
    return [script, result.current.theme];
  }

  it.each([
    ['stored light, OS dark', 'light', true, 'light'],
    ['stored dark, OS light', 'dark', false, 'dark'],
    ['garbage stored, OS dark', 'blue', true, 'dark'],
    ['nothing stored, OS light', null, false, 'light'],
  ])('%s', (_, stored, osDark, expected) => {
    prefersDark(osDark as boolean);
    if (stored) vi.stubGlobal('localStorage', memoryStorage({ theme: stored as string }));
    expect(both()).toEqual([expected, expected]);
  });

  it('falls back to the OS when localStorage throws', () => {
    prefersDark(true);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    new Function(body)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
