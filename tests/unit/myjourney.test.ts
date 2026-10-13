import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MyJourney } from '../../src/pages/MyJourney';
import { fetchTimeline } from '../../src/services/notion';

vi.mock('../../src/services/notion', () => ({ fetchTimeline: vi.fn() }));
vi.mock('../../src/lib/analytics', () => ({ track: vi.fn() }));

describe('MyJourney', () => {
  it('shows the error state when the fetch rejects', async () => {
    vi.mocked(fetchTimeline).mockRejectedValue(new Error('boom'));
    render(createElement(MyJourney));

    expect(await screen.findByText(/couldn't load journey/)).toBeInTheDocument();
    expect(screen.queryByText('$ no commits yet')).toBeNull();
  });

  it('shows the empty state for an empty list', async () => {
    vi.mocked(fetchTimeline).mockResolvedValue([]);
    render(createElement(MyJourney));

    expect(await screen.findByText('$ no commits yet')).toBeInTheDocument();
  });

  it('uses theme tokens, not hard-coded white borders', async () => {
    vi.mocked(fetchTimeline).mockResolvedValue([
      {
        id: 'abcdef12-0000',
        title: 'Joined',
        description: '',
        date: '2024',
        category: 'Milestone',
        sortOrder: 1,
      },
      {
        id: 'abcdef34-0000',
        title: 'Left',
        description: '',
        date: '2025',
        category: 'Education',
        sortOrder: 2,
      },
    ]);
    const { container } = render(createElement(MyJourney));
    await screen.findByText(/Joined/);

    expect(container.querySelector('[class*="white/["]')).toBeNull();
  });
});
