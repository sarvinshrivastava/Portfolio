import type { NotionPage } from '../../src/services/notionParse';

const rt = (s: string) => ({ rich_text: [{ plain_text: s }] });
const title = (s: string) => ({ title: [{ plain_text: s }] });

export const aboutPages = (bio = 'hello'): NotionPage[] => [
  {
    id: 'a1',
    properties: {
      Bio: rt(bio),
      GitHub: { url: 'https://github.com/x' },
      LinkedIn: { url: 'javascript:alert(1)' },
      Email: { email: 'a@b.co' },
      Roles: { multi_select: [{ name: 'Dev' }] },
      Phone: { phone_number: '+910000000000' },
    },
  },
];

export const projectPages: NotionPage[] = [
  {
    id: 'p1',
    properties: {
      Name: title('Proj'),
      Description: rt('d'),
      Category: { select: { name: 'Web Dev' } },
      'Tech Stack': { multi_select: [{ name: 'TS' }] },
      'GitHub URL': { url: 'https://github.com/x/p' },
      Featured: { checkbox: true },
      'Sort Order': { number: 2 },
    },
  },
];

export const timelinePages: NotionPage[] = [
  { id: 't1', properties: { Name: title('A'), 'Sort Order': { number: 1 } } },
  { id: 't2', properties: { Name: title('B'), 'Sort Order': { number: 2 } } },
  { id: 't3', properties: { Name: title('C'), 'Sort Order': { number: 1 } } },
  { id: 't4', properties: { Name: title('D'), 'Sort Order': { number: 2 } } },
];

export const experiencePages: NotionPage[] = [
  {
    id: 'e1',
    properties: {
      Name: title('Old Co'),
      Role: rt('Eng'),
      'Start Date': { date: { start: '2020-01' } },
      Description: rt('one\n\ntwo'),
    },
  },
  {
    id: 'e2',
    properties: {
      Name: title('New Co'),
      Role: rt('Eng'),
      'Start Date': { date: { start: '2023-01' } },
    },
  },
];
