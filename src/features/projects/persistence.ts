import { create } from 'zustand';
import { getRepository, type ProjectSnapshot } from '../../core/fs/database';
import { useWorkspace } from '../explorer/store';
import { useUI } from '../../shared/ui-store';

export const usePersistence = create<{
  state: 'Restoring' | 'Saving' | 'Saved' | 'Save failed';
  hydrated: boolean;
}>(() => ({ state: 'Restoring', hydrated: false }));
let queue: Promise<void> = Promise.resolve();
export function snapshot(): ProjectSnapshot {
  const { projectId, projectName, tree, tabs, active } = useWorkspace.getState();
  return {
    projectId,
    projectName,
    tree,
    tabs,
    active,
    updatedAt: Date.now(),
    lastOpened: Date.now(),
  };
}
export async function persistCurrent(): Promise<void> {
  const data = snapshot();
  usePersistence.setState({ state: 'Saving' });
  const save = queue.catch(() => {}).then(() => getRepository().save(data));
  queue = save;
  try {
    await save;
    if (useWorkspace.getState().tree === data.tree) useWorkspace.setState({ dirty: [] });
    usePersistence.setState({ state: 'Saved' });
  } catch (error) {
    usePersistence.setState({ state: 'Save failed' });
    useUI.getState().reportError(`Could not save your workspace: ${String(error)}`);
    throw error;
  }
}
export function startPersistence() {
  let alive = true;
  let unsubscribe = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    if (usePersistence.getState().hydrated) void persistCurrent().catch(() => {});
  };
  void (async () => {
    try {
      const data = await getRepository().current();
      if (!alive) return;
      if (data) useWorkspace.setState({ ...data, dirty: [] });
      usePersistence.setState({ hydrated: true, state: 'Saved' });
      if (!data) await persistCurrent();
      if (!alive) return;
      unsubscribe = useWorkspace.subscribe((state, previous) => {
        if (
          state.tree === previous.tree &&
          state.tabs === previous.tabs &&
          state.active === previous.active &&
          state.projectName === previous.projectName
        )
          return;
        clearTimeout(timer);
        usePersistence.setState({ state: 'Saving' });
        timer = setTimeout(flush, 500);
      });
    } catch (error) {
      if (alive) {
        usePersistence.setState({ hydrated: true, state: 'Save failed' });
        useUI.getState().reportError(`Workspace storage unavailable: ${String(error)}`);
      }
    }
  })();
  const visibility = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', flush);
  return () => {
    alive = false;
    clearTimeout(timer);
    unsubscribe();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', flush);
  };
}
