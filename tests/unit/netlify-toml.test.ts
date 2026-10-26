// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const toml = readFileSync(resolve(__dirname, '../../netlify.toml'), 'utf8');

describe('netlify.toml redirects', () => {
  it('has no redirect for /resume.pdf: the edge function owns that path', () => {
    expect(toml).not.toMatch(/^\s*from\s*=\s*"\/resume\.pdf"/m);
  });

  it('keeps the SPA rewrite as the last redirect', () => {
    const froms = [...toml.matchAll(/^\s*from\s*=\s*"([^"]+)"/gm)].map(m => m[1]);
    expect(froms.at(-1)).toBe('/*');
  });
});
