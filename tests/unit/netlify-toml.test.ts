// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const toml = readFileSync(resolve(__dirname, '../../netlify.toml'), 'utf8');

describe('netlify.toml resume proxy', () => {
  it('proxies /resume.pdf with status 200 and force, before the /* rule', () => {
    const resume = toml.search(/^\s*from\s*=\s*"\/resume\.pdf"/m);
    const spa = toml.search(/^\s*from\s*=\s*"\/\*"/m);
    expect(resume).toBeGreaterThan(-1);
    expect(spa).toBeGreaterThan(-1);
    expect(resume).toBeLessThan(spa);

    const block = toml.slice(resume, spa);
    expect(block).toMatch(/^\s*status\s*=\s*200\s*$/m);
    expect(block).toMatch(/^\s*force\s*=\s*true\s*$/m);
    expect(block).toMatch(
      /^\s*to\s*=\s*"https:\/\/notion-cache\.vps\.sarvinshrivastava\.space\/resume\.pdf"\s*$/m,
    );
  });
});
