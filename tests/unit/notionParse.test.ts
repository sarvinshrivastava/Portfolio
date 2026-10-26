// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  parseAbout,
  parseExperience,
  parseProjects,
  parseTimeline,
} from '../../src/services/notionParse';
import {
  aboutPages,
  experiencePages,
  projectPages,
  timelinePages,
} from '../support/notionFixtures';

describe('notionParse', () => {
  it('parses About and drops unsafe urls', () => {
    expect(parseAbout(aboutPages())).toEqual({
      bio: 'hello',
      github: 'https://github.com/x',
      linkedin: undefined,
      x: undefined,
      medium: undefined,
      email: 'a@b.co',
      roles: ['Dev'],
    });
  });

  it('parses Projects with defaults', () => {
    expect(parseProjects(projectPages)).toEqual([
      {
        id: 'p1',
        title: 'Proj',
        description: 'd',
        category: 'Web Dev',
        techStack: ['TS'],
        githubUrl: 'https://github.com/x/p',
        imageUrl: undefined,
        date: undefined,
        featured: true,
        sortOrder: 2,
      },
    ]);
  });

  it('orders the timeline as reverse then a stable ascending sort, as MyJourney displayed it', () => {
    const expected = [...timelinePages]
      .map(p => ({ id: p.id, sortOrder: p.properties['Sort Order'].number as number }))
      .reverse()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(p => p.id);
    const got = parseTimeline(timelinePages).map(e => e.id);
    expect(got).toEqual(expected);
    // Ties keep the reversed order: t3 before t1, t4 before t2.
    expect(got).toEqual(['t3', 't1', 't4', 't2']);
  });

  it('does not mutate its input', () => {
    const before = timelinePages.map(p => p.id);
    parseTimeline(timelinePages);
    expect(timelinePages.map(p => p.id)).toEqual(before);
  });

  it('sorts Experience newest first and splits the description', () => {
    const out = parseExperience(experiencePages);
    expect(out.map(e => e.company)).toEqual(['New Co', 'Old Co']);
    expect(out[1].description).toEqual(['one', 'two']);
    expect(out[0].endDate).toBeUndefined();
  });
});
