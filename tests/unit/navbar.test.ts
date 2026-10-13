import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Navbar } from '../../src/components/layout/Navbar';
import { track } from '../../src/lib/analytics';

// `track` is a no-op outside PROD, so mock it to observe the calls.
vi.mock('../../src/lib/analytics', () => ({ track: vi.fn() }));

const RESUME = 'https://example.com/cv';

function renderNavbar(path = '/') {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(Navbar, { theme: 'dark', onThemeToggle: () => {}, resumeUrl: RESUME }),
    ),
  );
}

afterEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

describe('Navbar', () => {
  it('(a) paints the scrolled background on first render when the page is already scrolled', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
    const { container } = renderNavbar();

    expect(container.querySelector('header')?.classList.contains('bg-bg')).toBe(true);
  });

  it('(b) closes the drawer when the link to the current page is clicked', () => {
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Mobile menu' });

    fireEvent.click(within(dialog).getByRole('link', { name: /Home/ }));

    expect(screen.queryByRole('dialog', { name: 'Mobile menu' })).toBeNull();
  });

  it('(b2) closes the drawer when the brand link is clicked', () => {
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(screen.getByRole('dialog', { name: 'Mobile menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Sarvin Shrivastava/ }));

    expect(screen.queryByRole('dialog', { name: 'Mobile menu' })).toBeNull();
  });

  it('(b3) returns focus to the hamburger after a same-path or resume close', () => {
    renderNavbar();
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });

    fireEvent.click(toggle);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Mobile menu' })).getByRole('link', { name: /Home/ }),
    );
    expect(document.activeElement).toBe(toggle);

    toggle.blur();
    fireEvent.click(toggle);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Mobile menu' })).getByRole('link', {
        name: /resume/,
      }),
    );
    expect(document.activeElement).toBe(toggle);
  });

  it('(c) tracks the mobile resume link and closes the drawer', () => {
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Mobile menu' });

    fireEvent.click(within(dialog).getByRole('link', { name: /resume/ }));

    expect(track).toHaveBeenCalledWith('resume_open', { source: 'mobile_menu' });
    expect(screen.queryByRole('dialog', { name: 'Mobile menu' })).toBeNull();
  });

  it('(d) names the cv link by its visible text, with no aria-label override', () => {
    renderNavbar();
    const link = screen.getByRole('link', { name: /cv/ });

    expect(link.hasAttribute('aria-label')).toBe(false);
    expect(link).toHaveAccessibleName(/resume/);
    expect(link).toHaveAccessibleName(/cv/);
    expect(link).not.toHaveAccessibleName(/PDF/);
    expect(link.querySelector('[aria-hidden="true"]')?.textContent).toContain('↓');
  });

  it('(d2) names the drawer resume link without the prompt or arrow glyphs', () => {
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Mobile menu' });
    const link = within(dialog).getByRole('link', { name: /resume/ });

    expect(link).toHaveAccessibleName(/opens in new tab/);
    expect(link).not.toHaveAccessibleName(/↓/);
    expect(link).not.toHaveAccessibleName(/\$/);
  });

  it('(b4) treats /projects/ as the current page and returns focus to the hamburger', () => {
    renderNavbar('/projects/');
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    fireEvent.click(toggle);
    const dialog = screen.getByRole('dialog', { name: 'Mobile menu' });

    fireEvent.click(within(dialog).getByRole('link', { name: /Projects/ }));

    expect(screen.queryByRole('dialog', { name: 'Mobile menu' })).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});
