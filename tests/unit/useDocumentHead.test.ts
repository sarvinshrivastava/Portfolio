import { beforeEach, describe, expect, it } from 'vitest';
import { createElement, useEffect } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useDocumentHead } from '../../src/hooks/useDocumentHead';

/**
 * Each route file ships its own head; after that, react-router navigates
 * without fetching HTML. This hook is what keeps the title and canonical from
 * going stale. The head is seeded the way the built HTML ships it.
 */

let go: (to: string) => void;

function Harness() {
  useDocumentHead();
  const navigate = useNavigate();
  useEffect(() => {
    go = navigate;
  }, [navigate]);
  return null;
}

function mount(initial: string) {
  return render(createElement(MemoryRouter, { initialEntries: [initial] }, createElement(Harness)));
}

const canonical = () => document.querySelector('link[rel="canonical"]')!.getAttribute('href');
const description = () =>
  document.querySelector('meta[name="description"]')!.getAttribute('content');

beforeEach(() => {
  document.head.innerHTML =
    '<title>seed</title><meta name="description" content="seed" /><link rel="canonical" href="seed" />';
});

describe('useDocumentHead', () => {
  it('sets the head for the landing route and follows client navigation', async () => {
    const { rerender } = mount('/projects');
    expect(document.title).toMatch(/^Projects by Sarvin Shrivastava/);
    expect(canonical()).toBe('https://sarvinshrivastava.space/projects');

    go('/');
    rerender(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(Harness)));
    await Promise.resolve();
    expect(document.title).toMatch(/^Sarvin Shrivastava — /);
    expect(canonical()).toBe('https://sarvinshrivastava.space/');
    expect(description()).toMatch(/Habuild Healthtech/);
  });

  it('resolves a trailing slash like the router does', () => {
    mount('/experience/');
    expect(canonical()).toBe('https://sarvinshrivastava.space/experience');
  });

  it('leaves the head alone on unknown routes', () => {
    mount('/nope');
    expect(document.title).toBe('seed');
    expect(canonical()).toBe('seed');
  });

  it('does not create tags that are missing', () => {
    document.head.innerHTML = '';
    mount('/projects');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
