import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { useKeyboardNav } from '../../src/hooks/useKeyboardNav';
import { track } from '../../src/lib/analytics';

vi.mock('../../src/lib/analytics', () => ({ track: vi.fn() }));

// Renders the router location into the DOM so tests read it without module state.
function Probe() {
  return createElement('output', { 'data-probe': 'path' }, useLocation().pathname);
}
const currentPath = () => document.querySelector('[data-probe="path"]')?.textContent;

function mount(initial: string, options: { resumeUrl?: string } = {}) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initial] }, createElement(Probe), children);
  return renderHook(() => useKeyboardNav({ onThemeToggle: () => {}, ...options }), { wrapper });
}

/** Dispatch a keydown on `target` and return it so callers can read `defaultPrevented`. */
function press(key: string, target: Element = document.body): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  parent: Element = document.body,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent.appendChild(node);
  return node;
}

const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  // jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
  if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});

describe('useKeyboardNav', () => {
  it('(a) blurs the focused nav link and navigates on ArrowRight', () => {
    const header = el('header');
    const link = el('a', header, { href: '#x' });
    mount('/');
    link.focus();
    expect(document.activeElement).toBe(link);

    press('ArrowRight');

    expect(document.activeElement).toBe(document.body);
    expect(currentPath()).toBe('/projects');
  });

  it('(b) at a boundary, blurs header focus but keeps body focus', () => {
    const header = el('header');
    const headerLink = el('a', header, { href: '#x' });
    const main = el('main');
    const button = el('button', main);
    mount('/experience');

    headerLink.focus();
    press('ArrowRight');
    expect(document.activeElement).toBe(document.body);
    expect(currentPath()).toBe('/experience');

    button.focus();
    press('ArrowRight');
    expect(document.activeElement).toBe(button);
  });

  it('(c) idle ArrowDown blurs header focus only', () => {
    const header = el('header');
    const headerLink = el('a', header, { href: '#x' });
    const button = el('button', el('main'));
    mount('/');

    headerLink.focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(document.body);

    button.focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(button);
  });

  it('(d) Enter on the focused filter button still reaches its onClick', () => {
    const filter = el('div', document.body, { 'data-keynav-filter': '' });
    const button = el('button', filter);
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    mount('/');

    press('/');
    expect(document.activeElement).toBe(button);
    const enter = press('Enter', button);
    expect(enter.defaultPrevented).toBe(false);
    button.click(); // native activation that Enter performs in a browser

    expect(document.activeElement).toBe(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('(d2) / with a filter present is prevented', () => {
    const filter = el('div', document.body, { 'data-keynav-filter': '' });
    el('button', filter);
    mount('/');

    expect(press('/').defaultPrevented).toBe(true);
  });

  it('(e) j blurs a focused section button and highlights the section', () => {
    const section = el('section', el('main'), { 'data-keynav-section': '' });
    const button = el('button', section);
    mount('/');
    button.focus();

    press('j');

    expect(document.activeElement).toBe(document.body);
    expect(section.classList.contains('keynav-focused')).toBe(true);
  });

  it('(f) r opens the Notion resume URL and tracks it', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    mount('/', { resumeUrl: 'https://example.com/cv' });

    press('r');

    expect(open).toHaveBeenCalledWith('https://example.com/cv', '_blank', 'noopener');
    expect(track).toHaveBeenCalledWith('resume_open', { source: 'keyboard' });
  });

  it('(f2) r without a resumeUrl does nothing and is not prevented', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    mount('/');

    const event = press('r');

    expect(open).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('(g) with help open, arrows do nothing; Escape closes it', () => {
    const { result } = mount('/');
    press('h');
    expect(result.current.showHelp).toBe(true);

    press('ArrowRight');
    expect(currentPath()).toBe('/');

    press('Escape');
    expect(result.current.showHelp).toBe(false);
  });

  it('(h) Enter on a Tab-focused other button leaves activation to it', () => {
    const section = el('section', el('main'), { 'data-keynav-section': '' });
    const target = el('button', section, { 'data-keynav-element': '' });
    const other = el('button');
    const targetClick = vi.fn();
    const otherClick = vi.fn();
    target.addEventListener('click', targetClick);
    other.addEventListener('click', otherClick);
    mount('/');

    press('j'); // section mode
    press('j'); // element mode on `target`
    expect(target.classList.contains('keynav-focused')).toBe(true);

    other.focus();
    const enter = press('Enter', other);
    other.click(); // native activation

    expect(targetClick).not.toHaveBeenCalled();
    expect(otherClick).toHaveBeenCalledTimes(1);
    expect(enter.defaultPrevented).toBe(false);
    expect(target.classList.contains('keynav-focused')).toBe(false);
  });

  it.each([
    ['button', 'button', {}],
    ['focusable div', 'div', { tabindex: '-1' }],
  ] as const)('(h2) Enter in element mode clicks a %s once and is prevented', (_n, tag, attrs) => {
    const section = el('section', el('main'), { 'data-keynav-section': '' });
    const target = el(tag, section, { 'data-keynav-element': '', ...attrs });
    const onClick = vi.fn();
    target.addEventListener('click', onClick);
    mount('/');

    press('j');
    press('j');
    const enter = press('Enter');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(enter.defaultPrevented).toBe(true);
  });

  it.each(['d', 'h', 'r'])('(k) %s drops focus from a header link', key => {
    const link = el('a', el('header'), { href: '#x' });
    mount('/', { resumeUrl: 'https://example.com/cv' });
    vi.spyOn(window, 'open').mockReturnValue(null);
    link.focus();

    press(key);

    expect(document.activeElement).toBe(document.body);
  });

  it('(k2) ArrowUp from the first section drops header focus', () => {
    const link = el('a', el('header'), { href: '#x' });
    el('section', el('main'), { 'data-keynav-section': '' });
    mount('/');
    press('j'); // section mode at index 0
    link.focus();

    press('ArrowUp');

    expect(document.activeElement).toBe(document.body);
  });

  it('(l) Escape in an input leaves keynav but keeps focus in the field', () => {
    const section = el('section', el('main'), { 'data-keynav-section': '' });
    const target = el('button', section, { 'data-keynav-element': '' });
    const input = el('input', document.body);
    mount('/');
    press('j');
    press('j'); // element mode
    expect(target.classList.contains('keynav-focused')).toBe(true);
    input.focus();

    press('Escape', input);

    expect(document.activeElement).toBe(input);
    expect(document.querySelector('.keynav-focused')).toBeNull();
  });

  it('(m) arrows on an unknown route are not prevented and drop header focus', () => {
    const link = el('a', el('header'), { href: '#x' });
    mount('/nope');
    link.focus();

    expect(press('ArrowRight').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(document.body);
    link.focus();
    expect(press('ArrowLeft').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('(m2) arrows on a known page are prevented', () => {
    mount('/');

    expect(press('ArrowRight').defaultPrevented).toBe(true);
  });

  it('(i) / with no filter on the page is not prevented', () => {
    mount('/');

    expect(press('/').defaultPrevented).toBe(false);
  });

  it('(j) normalises case and trailing slash for page navigation', () => {
    mount('/Projects/');

    press('ArrowRight');

    expect(currentPath()).toBe('/my-journey');
  });
});
