// @vitest-environment jsdom
import { StrictMode, createElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeLocalStorage } from '../support/notionHarness';

vi.mock('../../src/lib/analytics', () => ({ track: vi.fn(), trackOnce: vi.fn() }));

/** `shown` in Toast.tsx and the store in notion.ts are module state, so every test re-imports. */
async function setup(wrapper?: typeof StrictMode) {
  vi.resetModules();
  const notion = await import('../../src/services/notion');
  const { FallbackToast } = await import('../../src/components/ui/Toast');
  const el = createElement(FallbackToast);
  const view = render(wrapper ? createElement(wrapper, null, el) : el);
  return { notion, view };
}

const emit = (detail: { reason: 'rate_limited' | 'unavailable'; savedAt: number }) =>
  act(() => {
    window.dispatchEvent(new CustomEvent('notion:fallback', { detail }));
  });

const timeText = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const visibleText = () => document.querySelector('p[aria-hidden="true"]');

const SAVED = Date.parse('2026-10-20T10:30:00.000Z');

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
  vi.stubGlobal('sessionStorage', makeLocalStorage());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FallbackToast', () => {
  it('mounts the live region before any event, with no visible box', async () => {
    const { view } = await setup();

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(view.container.querySelector('button')).toBeNull();
  });

  it('shows on mount for an event recorded before it mounted', async () => {
    vi.resetModules();
    const notion = await import('../../src/services/notion');
    notion.setLastFallback({ reason: 'unavailable', savedAt: SAVED });
    const { FallbackToast } = await import('../../src/components/ui/Toast');
    render(createElement(FallbackToast));

    expect(screen.getByRole('status')).toHaveTextContent(/couldn't reach the server/);
  });

  it('writes the reason and time into the live region and the visible box', async () => {
    await setup();
    emit({ reason: 'rate_limited', savedAt: SAVED });

    const expected = `$ rate limit reached — showing saved data from ${timeText(SAVED)}`;
    expect(screen.getByRole('status')).toHaveTextContent(expected);
    expect(visibleText()).toHaveTextContent(expected);
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('drops " from" for an invalid time', async () => {
    await setup();
    emit({ reason: 'unavailable', savedAt: NaN });

    expect(screen.getByRole('status')).toHaveTextContent(
      "$ couldn't reach the server — showing saved data",
    );
    expect(screen.getByRole('status').textContent).not.toContain(' from');
  });

  it('shows nothing new for a second event in the same session', async () => {
    await setup();
    emit({ reason: 'rate_limited', savedAt: SAVED });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    emit({ reason: 'unavailable', savedAt: SAVED });

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('removes the text when closed', async () => {
    await setup();
    emit({ reason: 'rate_limited', savedAt: SAVED });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(visibleText()).toBeNull();
  });

  it('hides after 8 s', async () => {
    vi.useFakeTimers();
    await setup();
    emit({ reason: 'rate_limited', savedAt: SAVED });

    act(() => void vi.advanceTimersByTime(7999));
    expect(visibleText()).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1));
    expect(visibleText()).toBeNull();
  });

  it('pauses on hover and re-arms on leave', async () => {
    vi.useFakeTimers();
    await setup();
    emit({ reason: 'rate_limited', savedAt: SAVED });
    const box = visibleText()?.parentElement as HTMLElement;

    fireEvent.mouseEnter(box);
    act(() => void vi.advanceTimersByTime(20_000));
    expect(visibleText()).not.toBeNull();

    fireEvent.mouseLeave(box);
    act(() => void vi.advanceTimersByTime(8000));
    expect(visibleText()).toBeNull();
  });

  it('still shows once when sessionStorage throws', async () => {
    const boom = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('sessionStorage', { getItem: boom, setItem: boom });
    await setup();

    expect(() => emit({ reason: 'rate_limited', savedAt: SAVED })).not.toThrow();
    expect(screen.getByRole('status')).toHaveTextContent(/rate limit reached/);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    emit({ reason: 'rate_limited', savedAt: SAVED });
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('still hides after 8 s under StrictMode', async () => {
    vi.useFakeTimers();
    await setup(StrictMode);
    emit({ reason: 'rate_limited', savedAt: SAVED });
    expect(visibleText()).not.toBeNull();

    act(() => void vi.advanceTimersByTime(8000));
    expect(visibleText()).toBeNull();
  });
});
