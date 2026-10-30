import { useState, type KeyboardEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  FilePlus2,
  FolderPlus,
  MoreHorizontal,
} from 'lucide-react';
import { basename, childPaths, dirname } from '../../core/fs/vfs';
import { IconButton } from '../../shared/IconButton';
import { FormDialog } from '../../shared/FormDialog';
import { useUI } from '../../shared/ui-store';
import { useWorkspace } from './store';
import { motion, useReducedMotion } from 'motion/react';

type Action = { kind: 'file' | 'folder' | 'rename' | 'move' | 'delete'; path: string };
export function Explorer() {
  const reducedMotion = useReducedMotion();
  const s = useWorkspace();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const folder = s.tree[selected]?.kind === 'folder' ? selected : dirname(selected);
  const toggle = (path: string) =>
    setCollapsed((items) =>
      items.includes(path) ? items.filter((p) => p !== path) : [...items, path],
    );
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, path: string) => {
    const items = [
      ...event.currentTarget
        .closest('[role=tree]')!
        .querySelectorAll<HTMLButtonElement>('[role=treeitem]'),
    ];
    const index = items.indexOf(event.currentTarget);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      items[
        Math.max(0, Math.min(items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
      ]?.focus();
    }
    if (event.key === 'ArrowRight' && collapsed.includes(path)) toggle(path);
    if (event.key === 'ArrowLeft' && s.tree[path].kind === 'folder' && !collapsed.includes(path))
      toggle(path);
    if (event.key === 'F2') {
      event.preventDefault();
      setAction({ kind: 'rename', path });
    }
    if (event.key === 'Delete') setAction({ kind: 'delete', path });
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setMenu({ x: rect.x + 20, y: rect.bottom, path });
    }
  };
  const render = (parent = '', level = 1) =>
    childPaths(s.tree, parent).map((path) => {
      const node = s.tree[path];
      const expanded = !collapsed.includes(path);
      return (
        <div key={path}>
          <button
            role="treeitem"
            aria-level={level}
            aria-selected={selected === path}
            aria-expanded={node.kind === 'folder' ? expanded : undefined}
            className={`tree-row ${s.active === path ? 'active' : ''}`}
            style={{ paddingLeft: 12 + (level - 1) * 15 }}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', path)}
            onDragOver={(e) => {
              if (node.kind === 'folder') e.preventDefault();
            }}
            onDrop={(e) => {
              if (node.kind !== 'folder') return;
              e.preventDefault();
              e.stopPropagation();
              const source = e.dataTransfer.getData('text/plain');
              try {
                s.move(source, `${path}/${basename(source)}`);
              } catch (error) {
                useUI.getState().reportError(error);
              }
            }}
            onFocus={() => setSelected(path)}
            onClick={() => {
              setSelected(path);
              if (node.kind === 'folder') toggle(path);
              else s.open(path);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelected(path);
              setMenu({ x: e.clientX, y: e.clientY, path });
            }}
            onKeyDown={(e) => keyboard(e, path)}
          >
            {node.kind === 'folder' ? (
              <>
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {expanded ? <FolderOpen size={15} /> : <Folder size={15} />}
              </>
            ) : (
              <>
                <span className="tree-indent" />
                <FileCode2 size={15} className={path.endsWith('.py') ? 'python-icon' : ''} />
              </>
            )}
            <span>{basename(path)}</span>
            {s.dirty.includes(path) && <span className="dirty-dot" />}
          </button>
          {node.kind === 'folder' && expanded && <div role="group">{render(path, level + 1)}</div>}
        </div>
      );
    });
  return (
    <>
      <div className="explorer-heading">
        <button className="project-label" onClick={() => setSelected('')}>
          <ChevronDown size={13} />
          {s.projectName}
        </button>
        <div>
          <IconButton label="New file" onClick={() => setAction({ kind: 'file', path: folder })}>
            <FilePlus2 size={15} />
          </IconButton>
          <IconButton
            label="New folder"
            onClick={() => setAction({ kind: 'folder', path: folder })}
          >
            <FolderPlus size={15} />
          </IconButton>
          <IconButton
            label="Explorer actions"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu({ x: r.left, y: r.bottom, path: selected });
            }}
          >
            <MoreHorizontal size={15} />
          </IconButton>
        </div>
      </div>
      <div
        role="tree"
        aria-label="Project files"
        className="file-tree"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const from = e.dataTransfer.getData('text/plain');
          try {
            s.move(from, basename(from));
          } catch (error) {
            useUI.getState().reportError(error);
          }
        }}
      >
        {render()}
        {!Object.keys(s.tree).length && (
          <p className="padded muted">An open canvas. Create your first file.</p>
        )}
      </div>
      {menu && (
        <>
          <div className="menu-dismiss" onClick={() => setMenu(null)} />
          <motion.div
            className="context-menu"
            initial={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.12 }}
            role="menu"
            onKeyDown={(e) => {
              const items = [
                ...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
              ];
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? items.length - 1
                      : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items[next]?.focus();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setMenu(null);
              }
            }}
            style={{
              left: Math.min(menu.x, window.innerWidth - 190),
              top: Math.min(menu.y, window.innerHeight - 220),
            }}
          >
            {(['file', 'folder', 'rename', 'move', 'delete'] as const).map((kind, index) => (
              <button
                role="menuitem"
                autoFocus={index === 0}
                key={kind}
                disabled={!menu.path && ['rename', 'move', 'delete'].includes(kind)}
                onClick={() => {
                  setAction({ kind, path: ['file', 'folder'].includes(kind) ? folder : menu.path });
                  setMenu(null);
                }}
              >
                {
                  {
                    file: 'New file',
                    folder: 'New folder',
                    rename: 'Rename',
                    move: 'Move to path…',
                    delete: 'Delete…',
                  }[kind]
                }
              </button>
            ))}
          </motion.div>
        </>
      )}
      {action && (
        <FormDialog
          title={
            action.kind === 'delete'
              ? 'Delete from project'
              : action.kind === 'rename'
                ? 'Rename'
                : action.kind === 'move'
                  ? 'Move to path'
                  : `New ${action.kind}`
          }
          label={
            action.kind === 'delete'
              ? `Type ${basename(action.path)} to confirm deletion`
              : action.kind === 'move'
                ? 'Destination path (including name)'
                : 'Name'
          }
          initial={
            action.kind === 'rename'
              ? basename(action.path)
              : action.kind === 'move'
                ? action.path
                : ''
          }
          submitLabel={action.kind === 'delete' ? 'Delete' : 'Save'}
          onClose={() => setAction(null)}
          onSubmit={(value) => {
            if (action.kind === 'delete') {
              if (value !== basename(action.path)) throw new Error('The name does not match.');
              s.remove(action.path);
            } else if (action.kind === 'rename')
              s.move(action.path, [dirname(action.path), value].filter(Boolean).join('/'));
            else if (action.kind === 'move') s.move(action.path, value);
            else {
              const path = [action.path, value].filter(Boolean).join('/');
              s.create(
                path,
                action.kind === 'file' ? { kind: 'file', content: '' } : { kind: 'folder' },
              );
              if (action.kind === 'file') s.open(path);
            }
          }}
        />
      )}
    </>
  );
}
