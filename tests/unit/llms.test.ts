// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEO_ROUTES, canonicalUrl } from '../../src/seo/site';
import { PERSON, PROFILES } from '../../src/content/profile';

/**
 * public/llms.txt is hand-written; this keeps it in step with the route table
 * and the profile constants, and above geo.new's 5-line, one-link minimum.
 */
const text = readFileSync(resolve(__dirname, '../../public/llms.txt'), 'utf8');

describe('llms.txt', () => {
  it('has at least 5 non-empty lines', () => {
    expect(text.split('\n').filter(l => l.trim()).length).toBeGreaterThanOrEqual(5);
  });

  it('links every route, every profile and the email', () => {
    for (const route of SEO_ROUTES) expect(text).toContain(`(${canonicalUrl(route)})`);
    for (const url of Object.values(PROFILES)) expect(text).toContain(`(${url})`);
    expect(text).toContain(`(mailto:${PERSON.email})`);
  });
});
