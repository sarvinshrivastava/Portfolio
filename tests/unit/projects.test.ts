import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Projects } from '../../src/pages/Projects';
import { fetchProjects } from '../../src/services/notion';
import type { Project } from '../../src/types';

vi.mock('../../src/services/notion', () => ({ fetchProjects: vi.fn() }));
vi.mock('../../src/lib/analytics', () => ({ track: vi.fn() }));

const featured: Project = {
  id: 'p1',
  title: 'Featured Thing',
  description: 'desc',
  category: 'Tools',
  techStack: ['Go'],
  featured: true,
  sortOrder: 1,
};

describe('Projects', () => {
  it('shows a featured project with no ribbon and no featured border', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([featured]);
    const { container } = render(createElement(Projects));

    await screen.findByText('Featured Thing');

    expect(screen.queryByText(/featured/i, { selector: 'span' })).toBeNull();
    // The category Tag has its own 0.25 border, so match the card's 0.3 one exactly.
    expect(container.querySelector('[class*="rgba(245,166,35,0.3)"]')).toBeNull();
  });

  it('exposes the filter as a toggle-button group with aria-pressed', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([featured]);
    render(createElement(Projects));
    await screen.findByText('Featured Thing');

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByRole('group', { name: 'Filter projects by category' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'AI/ML' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the error text, and not the empty text, when the fetch rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(fetchProjects).mockRejectedValue(new Error('boom'));
    render(createElement(Projects));

    expect(await screen.findByText(/couldn't load projects/)).toBeInTheDocument();
    expect(screen.queryByText(/no projects/)).toBeNull();
  });

  it('shows the empty text for a filter with no matches', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([featured]);
    render(createElement(Projects));
    await screen.findByText('Featured Thing');

    fireEvent.click(screen.getByRole('button', { name: 'AI/ML' }));

    expect(screen.getByText('$ no projects in AI/ML')).toBeInTheDocument();
  });

  it('shows "no projects yet" under All when the list is empty', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([]);
    render(createElement(Projects));

    expect(await screen.findByText('$ no projects yet')).toBeInTheDocument();
  });
});
