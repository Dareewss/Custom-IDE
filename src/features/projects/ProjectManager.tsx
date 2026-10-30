import { useEffect, useRef, useState, useCallback } from 'react';
import { FolderOpen, Plus, X, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import { useUI } from '../../shared/ui-store';
import { IconButton } from '../../shared/IconButton';
import { FormDialog } from '../../shared/FormDialog';
import { getRepository, type ProjectSnapshot } from '../../core/fs/database';
import { useWorkspace } from '../explorer/store';
import { createProject, openProject, renameProject, deleteProject } from './actions';

export function ProjectManager() {
  const open = useUI((s) => s.modal === 'projects');
  const ref = useRef<HTMLDialogElement>(null);
  const active = useWorkspace((s) => s.projectId);
  const [projects, setProjects] = useState<ProjectSnapshot[]>([]);
  const [action, setAction] = useState<{
    kind: 'create' | 'rename' | 'delete';
    project?: ProjectSnapshot;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setProjects(await getRepository().list()), []);
  const close = () => useUI.setState({ modal: null });
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
      let alive = true;
      void getRepository()
        .list()
        .then((items) => {
          if (alive) setProjects(items);
        })
        .catch((error: unknown) => useUI.getState().reportError(error));
      return () => {
        alive = false;
      };
    } else ref.current?.close();
  }, [open, refresh]);
  return (
    <>
      <dialog
        className="dialog projects-dialog"
        ref={ref}
        aria-label="Project manager"
        onCancel={close}
      >
        <div className="dialog-heading">
          <h2>
            <FolderOpen size={18} />
            Your projects
          </h2>
          <IconButton label="Close projects" onClick={close}>
            <X size={16} />
          </IconButton>
        </div>
        <p className="muted settings-intro">Pick up where you left off, or start something new.</p>
        <div className="project-manager-actions">
          <button className="primary-button" onClick={() => setAction({ kind: 'create' })}>
            <Plus size={14} />
            New project
          </button>
        </div>
        <div className="eyebrow recent-heading">RECENT WORKSPACES</div>
        <div className="project-list">
          {projects.map((project) => (
            <div key={project.projectId} className="project-card">
              <button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void openProject(project.projectId)
                    .then(close)
                    .catch((error: unknown) => useUI.getState().reportError(error))
                    .finally(() => setBusy(false));
                }}
              >
                <FolderOpen size={21} />
                <span>
                  <strong>
                    {project.projectName}
                    {project.projectId === active && (
                      <small className="current-project">CURRENT</small>
                    )}
                  </strong>
                  <small>
                    Opened {new Date(project.lastOpened).toLocaleString()} ·{' '}
                    {Object.values(project.tree).filter((n) => n.kind === 'file').length} files
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </button>
              <IconButton
                label={`Rename ${project.projectName}`}
                onClick={() => setAction({ kind: 'rename', project })}
              >
                <Pencil size={13} />
              </IconButton>
              <IconButton
                label={`Delete ${project.projectName}`}
                onClick={() => setAction({ kind: 'delete', project })}
              >
                <Trash2 size={13} />
              </IconButton>
            </div>
          ))}
        </div>
      </dialog>
      {action && (
        <FormDialog
          title={
            action.kind === 'create'
              ? 'New project'
              : action.kind === 'rename'
                ? 'Rename project'
                : 'Delete project'
          }
          label={
            action.kind === 'delete'
              ? `Type ${action.project?.projectName} to confirm deletion`
              : 'Project name'
          }
          initial={action.kind === 'rename' ? action.project!.projectName : ''}
          submitLabel={
            action.kind === 'delete'
              ? 'Delete'
              : action.kind === 'create'
                ? 'Create project'
                : 'Save'
          }
          onClose={() => setAction(null)}
          onSubmit={async (name) => {
            if (action.kind === 'create') {
              await createProject(name);
              close();
            } else if (action.kind === 'rename')
              await renameProject(action.project!.projectId, name);
            else {
              if (name !== action.project!.projectName)
                throw new Error('The project name does not match.');
              await deleteProject(action.project!.projectId);
            }
            await refresh();
          }}
        />
      )}
    </>
  );
}
