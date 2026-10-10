import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { Credentials } from '../../src/components/sections/Credentials';
import { SectionHeading } from '../../src/components/ui/SectionHeading';
import { About } from '../../src/components/sections/About';
import { AboutContext } from '../../src/context/AboutContext';
import { CERTIFICATIONS, RECOMMENDATIONS } from '../../src/content/profile';
import type { About as AboutData } from '../../src/types';

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

  it('lists the 7 certifications with issuer and month', () => {
    render(createElement(Credentials));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(CERTIFICATIONS.length);
    expect(items[0]).toHaveTextContent('Claude Code in Action');
    expect(items[0]).toHaveTextContent('Anthropic · Mar 2026');
  });
});

describe('SectionHeading', () => {
  it('renders the page heading as h1 with the same classes as h2', () => {
    const { container: h1 } = render(createElement(SectionHeading, { as: 'h1', title: 'Page' }));
    const { container: h2 } = render(createElement(SectionHeading, { title: 'Section' }));
    expect(h1.querySelector('h1')!.className).toBe(h2.querySelector('h2')!.className);
  });
});

describe('About hash scroll', () => {
  it('scrolls to #about once on mount, not again when data arrives', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.history.replaceState(null, '', '/#about');

    const { rerender } = render(
      createElement(AboutContext.Provider, { value: null }, createElement(About)),
    );
    expect(scroll).toHaveBeenCalledTimes(1);

    const data: AboutData = { bio: 'bio', roles: [] };
    rerender(createElement(AboutContext.Provider, { value: data }, createElement(About)));
    expect(scroll).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, '', '/');
  });

  it('does nothing without the hash', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(createElement(About));
    expect(scroll).not.toHaveBeenCalled();
  });
});
