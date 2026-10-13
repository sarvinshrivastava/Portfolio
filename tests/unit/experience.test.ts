import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { Experience } from '../../src/pages/Experience';
import { fetchExperience } from '../../src/services/notion';
import type { Experience as ExperienceData } from '../../src/types';

vi.mock('../../src/services/notion', () => ({ fetchExperience: vi.fn() }));

const base: ExperienceData = {
  id: 'e1',
  company: 'Acme',
  role: 'Engineer',
  startDate: '2023-01',
  endDate: '2024-05',
  location: 'Remote',
  description: [],
  techStack: [],
  sortOrder: 1,
};

async function renderWith(exp: Partial<ExperienceData>) {
  vi.mocked(fetchExperience).mockResolvedValue([{ ...base, ...exp }]);
  const view = render(createElement(Experience));
  await screen.findByText('Acme');
  return view;
}

const highlights = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('p span.font-medium')).map(n => n.textContent);

describe('Experience', () => {
  it('shows no arrow and no "Present" start when the start date is empty', async () => {
    const { container } = await renderWith({ startDate: '' });

    const dates = container.querySelector('article p.text-accent')?.textContent;
    expect(dates).toBe('May 2024');
    expect(dates).not.toContain('→');
  });

  it('still shows "Present" for an empty end date', async () => {
    const { container } = await renderWith({ endDate: undefined });

    expect(container.querySelector('article p.text-accent')?.textContent).toBe('Jan 2023 → Present');
  });

  it('does not highlight "Go" inside "Google"', async () => {
    const { container } = await renderWith({
      description: ['worked at Google daily'],
      techStack: ['Go'],
    });

    expect(highlights(container)).toEqual([]);
  });

  it('highlights a whole-word tech and a tech with symbols like "C++"', async () => {
    const { container } = await renderWith({
      description: ['wrote C++ services', 'shipped in Go today'],
      techStack: ['C++', 'Go'],
    });

    expect(highlights(container)).toEqual(['C++', 'Go']);
  });

  it('shows the error state when the fetch rejects', async () => {
    vi.mocked(fetchExperience).mockRejectedValue(new Error('boom'));
    render(createElement(Experience));

    expect(await screen.findByText(/couldn't load experience/)).toBeInTheDocument();
    expect(screen.queryByText('$ no experience yet')).toBeNull();
  });

  it('shows the empty state for an empty list', async () => {
    vi.mocked(fetchExperience).mockResolvedValue([]);
    render(createElement(Experience));

    expect(await screen.findByText('$ no experience yet')).toBeInTheDocument();
  });

  it('uses theme tokens, not hard-coded white borders', async () => {
    const { container } = await renderWith({ techStack: ['Go'], description: ['x'] });

    expect(container.querySelector('[class*="white/["]')).toBeNull();
  });
});
