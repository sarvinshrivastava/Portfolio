import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { Hero } from '../../src/components/sections/Hero';
import { AboutContext } from '../../src/context/AboutContext';
import type { About } from '../../src/types';

const about: About = {
  bio: 'bio',
  roles: [], // keeps the typewriter timers off
};

describe('Hero', () => {
  it('has no resume call to action, even though the navbar links the resume', () => {
    const { container } = render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        createElement(AboutContext.Provider, { value: about }, createElement(Hero)),
      ),
    );

    expect(screen.queryByRole('link', { name: /resume/i })).toBeNull();
    expect(container.querySelector('a[href="/resume.pdf"]')).toBeNull();
  });
});
