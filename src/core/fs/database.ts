import { openDB, type DBSchema } from 'idb';
import type { FileTree } from './vfs';

export interface ProjectSnapshot {
  projectId: string;
  projectName: string;
  tree: FileTree;
  active: string | null;
  tabs: string[];
  updatedAt: number;
  lastOpened: number;
  breakpoints?: Record<string, number[]>;
}
interface AtlasDB extends DBSchema {
  projects: { key: string; value: ProjectSnapshot };
  meta: { key: string; value: string };
}
export function createRepository(name = 'code-atlas-v1') {
  const database = openDB<AtlasDB>(name, 1, {
    upgrade(db) {
      db.createObjectStore('projects', { keyPath: 'projectId' });
      db.createObjectStore('meta');
    },
  });
  return {
    async save(project: ProjectSnapshot) {
      const db = await database;
      const tx = db.transaction(['projects', 'meta'], 'readwrite');
      await Promise.all([
        tx.objectStore('projects').put(project),
        tx.objectStore('meta').put(project.projectId, 'active-project'),
        tx.done,
      ]);
    },
    async get(id: string) {
      return (await database).get('projects', id);
    },
    async current() {
      const db = await database;
      const id = await db.get('meta', 'active-project');
      return id ? db.get('projects', id) : undefined;
    },
    async list() {
      return (await (await database).getAll('projects')).sort(
        (a, b) => b.lastOpened - a.lastOpened,
      );
    },
    async remove(id: string) {
      await (await database).delete('projects', id);
    },
    async close() {
      (await database).close();
    },
  };
}
let repository: ReturnType<typeof createRepository> | undefined;
export function getRepository() {
  return (repository ??= createRepository());
}
