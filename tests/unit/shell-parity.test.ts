import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type FunctionComponent } from 'react';
import { render } from '@testing-library/react';
import { credentialsSection, renderShell, seoRouteFor } from '../../src/seo/site';

/**
 * The static shell in src/seo/site.ts copies components class for class, so
 * the swap to React on mount is invisible. These tests render the real
 * component and compare it with the shell string, so a style edit on one side
 * fails here instead of shipping a visible jump. They also pin the page-level
 * h1 on the subpages, whose copy is duplicated in SEO_ROUTES.
 */

// Pages fetch from Notion on mount; a pending promise keeps them in their
// first-paint (loading) state, which is exactly what the shell copies.
vi.mock('../../src/services/notion', () => {
  const pending = () => new Promise(() => {});
  return { fetchProjects: pending, fetchExperience: pending, fetchTimeline: pending };
});

const { Credentials } = await import('../../src/components/sections/Credentials');
const { Projects } = await import('../../src/pages/Projects');
const { Experience } = await import('../../src/pages/Experience');
const { MyJourney } = await import('../../src/pages/MyJourney');

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function fragment(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

/** Tag and class of every element, in document order. */
function skeleton(root: Element, drop: string[] = []): string[] {
  return [root, ...root.querySelectorAll('*')].map(el => {
    const classes = [...el.classList].filter(c => !drop.includes(c)).join(' ');
    return `${el.tagName.toLowerCase()}.${classes}`;
  });
}

describe('shell parity', () => {
  it('Credentials matches its shell copy, minus the reveal class', () => {
    const { container } = render(createElement(Credentials));
    const shell = fragment(credentialsSection());
    expect(skeleton(shell.firstElementChild!)).toEqual(
      skeleton(container.firstElementChild!, ['reveal-section']),
    );
  });

  it.each([
    ['/projects', Projects],
    ['/experience', Experience],
    ['/my-journey', MyJourney],
  ] as [string, FunctionComponent][])('%s: page h1 matches the shell h1', (path, Page) => {
    const { container } = render(createElement(Page));
    const route = seoRouteFor(path)!;
    const shellH1 = fragment(renderShell(route)).querySelector('h1')!;
    const pageH1s = container.querySelectorAll('h1');

    // <main> and its container: their padding positions the heading.
    const shellMain = fragment(renderShell(route)).querySelector('main')!;
    const pageMain = container.querySelector('main')!;
    expect(shellMain.className).toBe(pageMain.className);
    expect(shellMain.firstElementChild!.className).toBe(pageMain.firstElementChild!.className);

    expect(pageH1s).toHaveLength(1);
    expect(pageH1s[0].textContent).toBe(shellH1.textContent);
    expect(pageH1s[0].className).toBe(shellH1.className);
    // The prefix and subtitle around it are copied too. Per element: the shell's
    // newlines between block elements are layout-inert whitespace.
    const block = (el: Element) => [...el.parentElement!.children].map(c => c.textContent);
    expect(block(pageH1s[0])).toEqual(block(shellH1));
  });
});
