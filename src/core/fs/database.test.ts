import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { createRepository, type ProjectSnapshot } from './database';

it('persists project content and restores the last session', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const repo = createRepository(name);
  const project: ProjectSnapshot = {
    projectId: 'one',
    projectName: 'One',
    tree: { 'a.py': { kind: 'file', content: 'print(42)' } },
    tabs: ['a.py'],
    active: 'a.py',
    lastOpened: 1,
    updatedAt: 1,
  };
  await repo.save(project);
  await repo.close();
  const restored = createRepository(name);
  expect(await restored.current()).toEqual(project);
  await restored.save({ ...project, projectId: 'two', lastOpened: 2 });
  expect((await restored.list()).map((p) => p.projectId)).toEqual(['two', 'one']);
  await restored.remove('one');
  expect(await restored.get('one')).toBeUndefined();
  await restored.close();
});
