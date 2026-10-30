import { getRepository, type ProjectSnapshot } from '../../core/fs/database';
import type { FileTree } from '../../core/fs/vfs';
import { useWorkspace } from '../explorer/store';
import { persistCurrent } from './persistence';
import { stopRun, useRunner } from '../runner/store';
import { useDiagnostics } from '../editor/diagnostics';
import { useLocation } from '../editor/navigation';

function validName(name: string) {
  if (!name.trim() || name.length > 80)
    throw new Error('Use a project name between 1 and 80 characters.');
  return name.trim();
}
async function activate(data: ProjectSnapshot) {
  stopRun();
  useRunner.setState({ status: 'idle', output: [], exitCode: null, elapsed: 0 });
  useDiagnostics.setState({ syntax: {}, runtime: [] });
  useLocation.setState({ target: null });
  useWorkspace.setState({
    ...data,
    breakpoints: data.breakpoints ?? {},
    lastOpened: Date.now(),
    dirty: [],
  });
  await persistCurrent();
}
export async function createProject(
  name: string,
  tree: FileTree = { 'main.py': { kind: 'file', content: 'print("Hello, world!")\n' } },
  entry = 'main.py',
) {
  const projectName = validName(name);
  await persistCurrent();
  const now = Date.now();
  const data: ProjectSnapshot = {
    projectId: crypto.randomUUID(),
    projectName,
    tree,
    tabs: tree[entry]?.kind === 'file' ? [entry] : [],
    active: tree[entry]?.kind === 'file' ? entry : null,
    lastOpened: now,
    updatedAt: now,
  };
  await activate(data);
}
export async function openProject(id: string) {
  await persistCurrent();
  const data = await getRepository().get(id);
  if (!data) throw new Error('This project could not be found.');
  await activate(data);
}
export async function renameProject(id: string, name: string) {
  const projectName = validName(name);
  if (useWorkspace.getState().projectId === id) {
    useWorkspace.setState({ projectName });
    await persistCurrent();
  } else {
    const data = await getRepository().get(id);
    if (!data) throw new Error('Project not found.');
    await getRepository().save({ ...data, projectName, updatedAt: Date.now() }, false);
  }
}
export async function deleteProject(id: string) {
  if (useWorkspace.getState().projectId === id) {
    const others = (await getRepository().list()).filter((p) => p.projectId !== id);
    if (others[0]) await openProject(others[0].projectId);
    else await createProject('Untitled project');
  }
  await getRepository().remove(id);
}
