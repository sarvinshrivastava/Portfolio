import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { Credentials } from '../../src/components/sections/Credentials';
import { Connect } from '../../src/components/sections/Connect';
import { SectionHeading } from '../../src/components/ui/SectionHeading';
import { About } from '../../src/components/sections/About';
import { AboutContext } from '../../src/context/AboutContext';
import {
  BIO,
  CERTIFICATIONS,
  RECOMMENDATIONS,
  STATIC_ABOUT,
  monthYear,
} from '../../src/content/profile';
import type { About as AboutData } from '../../src/types';

const originalScrollIntoView = Element.prototype.scrollIntoView;
afterEach(() => {
  // Restored even when an assertion throws, so one failure cannot cascade.
  window.history.replaceState(null, '', '/');
  // jsdom has no scrollIntoView, so "restore" means removing the stub again.
  if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});

// jsdom has no IntersectionObserver; the reveal animation is irrelevant here.
// Per test, because the config's `unstubGlobals` resets stubs after each one.
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

describe('Credentials', () => {
  it('quotes both recommendations verbatim with attribution', () => {
    const { container } = render(createElement(Credentials));
    const figures = container.querySelectorAll('figure');
    expect(figures).toHaveLength(2);
    figures.forEach((fig, i) => {
      expect(fig.querySelector('blockquote')!.textContent).toBe(`“${RECOMMENDATIONS[i].text}”`);
      expect(fig.querySelector('figcaption')!.textContent).toContain(RECOMMENDATIONS[i].name);
    });
    expect(figures[0].querySelector('figcaption')!.textContent).toContain('Sep 2024');
  });

  it('lists every certification with issuer and month', () => {
    render(createElement(Credentials));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(CERTIFICATIONS.length);
    items.forEach((item, i) => {
      expect(item).toHaveTextContent(CERTIFICATIONS[i].name);
      expect(item).toHaveTextContent(new RegExp(`· [A-Z][a-z]{2} \\d{4}$`));
    });
    expect(items[0]).toHaveTextContent('Anthropic · Mar 2026');
  });

  it('refuses a malformed date instead of rendering "undefined"', () => {
    expect(() => monthYear('2024')).toThrow(/bad date/);
    expect(() => monthYear('2024-13')).toThrow(/bad date/);
    expect(() => monthYear('2024-1')).toThrow(/bad date/);
    expect(() => monthYear('2024-09-xx')).toThrow(/bad date/);
    expect(monthYear('2024-09-20')).toBe('Sep 2024');
  });
});

describe('SectionHeading', () => {
  it('renders the page heading as h1 with the same classes as h2', () => {
    const { container: h1 } = render(createElement(SectionHeading, { as: 'h1', title: 'Page' }));
    const { container: h2 } = render(createElement(SectionHeading, { title: 'Section' }));
    expect(h1.querySelector('h1')!.className).toBe(h2.querySelector('h2')!.className);
  });
});

function aboutWith(data: AboutData | null) {
  return createElement(AboutContext.Provider, { value: data }, createElement(About));
}

describe.each([
  ['#connect', 'connect', () => createElement(Connect)],
  ['#credentials', 'credentials', () => createElement(Credentials)],
])('%s hash landing', (hash, id, element) => {
  it('scrolls to the section once, instantly, and reveals it before paint', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.history.replaceState(null, '', `/${hash}`);
    render(element());
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'instant' });
    expect(scroll.mock.contexts[0]).toBe(document.getElementById(id));
    expect(document.getElementById(id)).toHaveClass('revealed');
  });

  it('does nothing for another section\'s hash', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.history.replaceState(null, '', '/#about');
    render(element());
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe('scroll reveal', () => {
  it('reveals a section already on screen at mount, before any observer fires', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 500,
    } as DOMRect);
    render(createElement(Credentials));
    expect(document.getElementById('credentials')).toHaveClass('revealed');
  });

  it('leaves a section below the fold for the observer', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: window.innerHeight + 10,
      bottom: window.innerHeight + 400,
    } as DOMRect);
    render(createElement(Credentials));
    expect(document.getElementById('credentials')).not.toHaveClass('revealed');
  });
});

describe('About fallback', () => {
  it('shows the static bio when Notion returns an empty one', () => {
    const data: AboutData = { ...STATIC_ABOUT, bio: '' };
    const { container } = render(aboutWith(data));
    expect(container).toHaveTextContent(BIO);
  });

  it('shows Notion links when they differ from the static ones', () => {
    const data: AboutData = { bio: 'from notion', roles: [], github: 'https://github.com/other' };
    const { container } = render(aboutWith(data));
    expect(container).toHaveTextContent('from notion');
    expect([...container.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual([
      'https://github.com/other',
    ]);
  });
});

describe('About hash scroll', () => {
  it('scrolls to #about once on mount, not again when data arrives', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.history.replaceState(null, '', '/#about');

    const { rerender } = render(aboutWith(null));
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'instant' });
    // Revealed up front, so the section the visitor is looking at never fades.
    expect(document.getElementById('about')).toHaveClass('revealed');

    const data: AboutData = { bio: 'bio', roles: [] };
    rerender(aboutWith(data));
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the hash', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(createElement(About));
    expect(scroll).not.toHaveBeenCalled();
  });
});
