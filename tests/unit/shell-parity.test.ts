import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type FunctionComponent } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import {
  aboutSection,
  connectSection,
  credentialsSection,
  renderShell,
  seoRouteFor,
} from '../../src/seo/site';

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

const { Navbar } = await import('../../src/components/layout/Navbar');
const { Hero } = await import('../../src/components/sections/Hero');
const { Footer } = await import('../../src/components/layout/Footer');
const { Home } = await import('../../src/pages/Home');
const { Credentials } = await import('../../src/components/sections/Credentials');
const { About } = await import('../../src/components/sections/About');
const { Connect } = await import('../../src/components/sections/Connect');
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

/** Text of every leaf element, in document order, whitespace-normalised. */
function leafText(root: Element): string[] {
  return [root, ...root.querySelectorAll('*')]
    .filter(el => el.children.length === 0)
    .map(el => el.textContent!.replace(/\s+/g, ' ').trim());
}

/** Tag and class of every element, in document order. */
function skeleton(root: Element, drop: string[] = []): string[] {
  return [root, ...root.querySelectorAll('*')].map(el => {
    const classes = [...el.classList].filter(c => !drop.includes(c)).join(' ');
    return `${el.tagName.toLowerCase()}.${classes}`;
  });
}

/** Tag, classes and the attributes that matter for layout and navigation, in document order. */
function outline(root: Element): string[] {
  return [root, ...root.querySelectorAll('*')].map(el => {
    const attrs = ['href', 'aria-current', 'aria-expanded']
      .map(a => (el.hasAttribute(a) ? `${a}=${el.getAttribute(a)}` : ''))
      .filter(Boolean)
      .join(' ');
    return `${el.tagName.toLowerCase()}.${[...el.classList].join(' ')} ${attrs}`.trim();
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

  it('About first paint (no Notion data yet) matches its shell copy', () => {
    // No AboutContext provider: useAbout() is null, exactly as on first paint.
    const { container } = render(createElement(About));
    const shell = fragment(aboutSection()).firstElementChild!;
    const app = container.firstElementChild!;
    expect(skeleton(shell)).toEqual(skeleton(app, ['reveal-section']));
    expect(leafText(shell)).toEqual(leafText(app));
    const hrefs = (el: Element) => [...el.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(hrefs(shell)).toEqual(hrefs(app));
  });

  it('Connect heading and aside match its shell copy; the form slot is an empty div', () => {
    const { container } = render(createElement(Connect));
    const shell = fragment(connectSection()).firstElementChild!;
    const app = container.firstElementChild!;
    // Same section, container and heading block.
    expect(shell.className).toBe(app.className);
    expect(shell.id).toBe(app.id);
    const heading = (el: Element) => el.querySelector('.mb-12')!;
    expect(skeleton(heading(shell))).toEqual(skeleton(heading(app)));
    expect(leafText(heading(shell))).toEqual(leafText(heading(app)));
    // Same grid; the form's cell is held by an empty div so the aside keeps its column.
    const grid = (el: Element) => el.querySelector('.grid')!;
    expect(grid(shell).className).toBe(grid(app).className);
    expect(grid(app).firstElementChild!.tagName).toBe('FORM');
    expect(grid(shell).firstElementChild!.outerHTML).toBe('<div></div>');
    const aside = (el: Element) => el.querySelector('aside')!;
    expect(skeleton(aside(shell))).toEqual(skeleton(aside(app)));
    expect(leafText(aside(shell))).toEqual(leafText(aside(app)));
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
    expect(shellMain.id).toBe('main');
    expect(pageMain.id).toBe('main');
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
  it.each(['/', '/projects', '/my-journey', '/experience'])(
    'header nav at %s matches the shell (first paint: no About yet, so no cv link)',
    path => {
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
      const { container } = render(
        createElement(
          MemoryRouter,
          { initialEntries: [path] },
          createElement(Navbar, { theme: 'dark', onThemeToggle: () => {} }),
        ),
      );
      const shell = fragment(renderShell(seoRouteFor(path)!)).querySelector('header')!;
      const app = container.querySelector('header')!;
      // The theme button's glyph spans are the shell's CSS-variant trick; the nav
      // label differs on purpose ("Site" vs "Main navigation") and is not outlined.
      for (const header of [shell, app]) {
        header.querySelectorAll('button[aria-label^="Switch"]').forEach(b => b.replaceChildren());
        // NavLink marks the brand link active at "/" (class + aria-current); the
        // shell does not. It has no style, so it is normalised away rather than
        // changing the shipped shell markup.
        const brand = header.querySelector('nav > a')!;
        brand.classList.remove('active');
        brand.removeAttribute('aria-current');
      }
      expect(outline(shell.querySelector('nav')!)).toEqual(outline(app.querySelector('nav')!));
      expect(shell.className).toBe(app.className);
    },
  );

  it('hero section (no About yet) matches the shell hero', () => {
    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(Hero)),
    );
    const shell = fragment(renderShell(seoRouteFor('/')!)).querySelector('#hero')!;
    const app = container.firstElementChild!;
    expect(shell.id).toBe(app.id);
    expect(skeleton(shell)).toEqual(skeleton(app));
    expect(leafText(shell)).toEqual(leafText(app));
  });

  it('footer first row matches the shell footer', () => {
    const { container } = render(createElement(Footer));
    const shell = fragment(renderShell(seoRouteFor('/')!)).querySelector('footer')!;
    const app = container.querySelector('footer')!;
    expect(shell.className).toBe(app.className);
    expect(shell.firstElementChild!.className).toBe(app.firstElementChild!.className);
    const row = (el: Element) => el.querySelector('div > span:nth-of-type(2)')!;
    expect(skeleton(row(shell))).toEqual(skeleton(row(app)));
    expect(leafText(row(shell))).toEqual(leafText(row(app)));
  });

  it('Home has the same main#main as the shell', () => {
    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(Home)),
    );
    const shell = fragment(renderShell(seoRouteFor('/')!)).querySelector('main')!;
    const app = container.querySelector('main')!;
    expect(app.id).toBe('main');
    expect(shell.id).toBe(app.id);
    expect(shell.className).toBe(app.className);
  });

});
