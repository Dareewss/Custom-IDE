import { expect, it } from 'vitest';
import { parseView, readView, writeView } from './view-state';

it('validates malformed view state and keeps collapse settings isolated by project', () => {
  expect(parseView(null)).toEqual({ depth: 'all', collapsedIds: [] });
  expect(
    parseView({ depth: 'invalid', collapsedIds: ['one', 'one', null, 1, '', 'x'.repeat(5000)] }),
  ).toEqual({ depth: 'all', collapsedIds: ['one'] });
  writeView('project-a', { depth: 'classes', collapsedIds: ['one'] });
  writeView('project-b', { depth: 'files', collapsedIds: [] });
  expect(readView('project-a')).toEqual({ depth: 'classes', collapsedIds: ['one'] });
  expect(readView('project-b').depth).toBe('files');
  localStorage.setItem('atlas-overview-view-project-a', '{broken');
  expect(readView('project-a').depth).toBe('all');
});
