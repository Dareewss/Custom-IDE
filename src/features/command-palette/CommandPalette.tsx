import { Command } from 'cmdk';
import { useEffect, useRef, useState } from 'react';
import { Search, FileCode2, Terminal, ArrowUpRight } from 'lucide-react';
import { useWorkspace } from '../explorer/store';
import { runActive, stopRun, restartRun, useRunner, continueRun } from '../runner/store';
import { formatActive } from '../editor/formatter';
import { persistCurrent } from '../projects/persistence';
import { useUI } from '../../shared/ui-store';
import { FormDialog } from '../../shared/FormDialog';
import { exportProject } from '../projects/ZipActions';
import { useCursor } from '../editor/navigation';
import { useSettings } from '../settings/store';
import { requestObjectSearch } from '../overview/search';

const setMode = (paletteMode: 'commands' | 'files' | null) => useUI.setState({ paletteMode });
const setQuery = (paletteQuery: string) => useUI.setState({ paletteQuery });

export function CommandPalette() {
  const mode = useUI((s) => s.paletteMode);
  const query = useUI((s) => s.paletteQuery);
  const [create, setCreate] = useState<'file' | 'folder' | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const remember = (event: FocusEvent) => {
      const target = event.target;
      if (
        useUI.getState().paletteMode === null &&
        target instanceof HTMLElement &&
        target !== document.body &&
        !target.closest('[cmdk-dialog]')
      )
        returnFocus.current = target;
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);
  useEffect(() => {
    if (mode !== null) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const timer = window.setTimeout(() => {
      if (
        useUI.getState().paletteMode === null &&
        !document.querySelector('dialog[open]') &&
        returnFocus.current?.isConnected
      )
        returnFocus.current.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode]);
  const s = useWorkspace();
  const open = (next: 'commands' | 'files') => {
    setQuery('');
    setMode(next);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        useUI.getState().toggleSidebar();
      }
      if (mod && e.key === '`') {
        e.preventDefault();
        useUI.getState().toggleBottom();
      }
      if (
        mod &&
        e.key.toLowerCase() === 'l' &&
        (e.target as HTMLElement).closest('.bottom-panel')
      ) {
        e.preventDefault();
        useRunner.setState({ output: [] });
      }
      if (
        mod &&
        e.key.toLowerCase() === 'w' &&
        !(e.target as HTMLElement).closest('[role=dialog],dialog')
      ) {
        const workspace = useWorkspace.getState();
        if (workspace.active) {
          e.preventDefault();
          workspace.close(workspace.active);
        }
      }
      if (e.key === 'F10') {
        e.preventDefault();
        continueRun(true);
      }
      if (mod && !e.altKey && !e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        if (e.isComposing || document.querySelector('dialog[open]')) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        setQuery('');
        setMode(useUI.getState().paletteMode === 'commands' ? null : 'commands');
        return;
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        useUI.setState({ modal: 'settings' });
      }
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setQuery('');
        setMode(e.shiftKey ? 'commands' : 'files');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        if (mod && e.shiftKey) void restartRun();
        else if (e.shiftKey) stopRun();
        else if (useRunner.getState().status === 'paused') continueRun();
        else void runActive();
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void persistCurrent().catch(() => {});
      }
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        void formatActive();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);
  const commands = [
    { name: 'Search 3D objects', shortcut: '', run: requestObjectSearch },
    {
      name: 'Toggle orb animation',
      shortcut: '',
      run: () => {
        const s = useSettings.getState();
        s.setSetting('backgroundAnimation', !s.backgroundAnimation);
      },
    },
    {
      name: 'Toggle orbs',
      shortcut: '',
      run: () => {
        const s = useSettings.getState();
        s.setSetting('backgroundBlobs', !s.backgroundBlobs);
      },
    },
    ...(['code', 'split', 'focus'] as const).map((layout) => ({
      name: `${layout[0].toUpperCase() + layout.slice(1)} layout`,
      shortcut: '',
      run: () => useUI.getState().setLayout(layout),
    })),
    { name: 'Continue debugging', shortcut: 'F5', run: () => continueRun() },
    { name: 'Step Over', shortcut: 'F10', run: () => continueRun(true) },
    {
      name: 'Toggle breakpoint',
      shortcut: 'F9',
      run: () => {
        if (s.active) s.toggleBreakpoint(s.active, useCursor.getState().line);
      },
    },
    { name: 'Export project as ZIP', shortcut: '', run: exportProject },
    { name: 'Manage projects', shortcut: '', run: () => useUI.setState({ modal: 'projects' }) },
    { name: 'Open settings', shortcut: 'Ctrl ,', run: () => useUI.setState({ modal: 'settings' }) },
    { name: 'Run active file', shortcut: 'F5', run: runActive },
    { name: 'Stop execution', shortcut: 'Shift F5', run: stopRun },
    { name: 'Restart execution', shortcut: 'Ctrl Shift F5', run: restartRun },
    { name: 'Format Document', shortcut: 'Alt Shift F', run: formatActive },
    { name: 'Save workspace', shortcut: 'Ctrl S', run: persistCurrent },
    { name: 'New file', shortcut: '', run: () => setCreate('file') },
    { name: 'New folder', shortcut: '', run: () => setCreate('folder') },
    { name: 'Quick open file', shortcut: 'Ctrl P', run: () => open('files') },
    {
      name: 'Close active file',
      shortcut: '',
      run: () => {
        if (s.active) s.close(s.active);
      },
    },
    { name: 'Clear console', shortcut: '', run: () => useRunner.setState({ output: [] }) },
    { name: 'Toggle explorer', shortcut: '', run: () => useUI.getState().toggleSidebar() },
    { name: 'Toggle workbench', shortcut: '', run: () => useUI.getState().toggleBottom() },
    ...(['Console', 'Problems', 'Variables', 'Call Stack'] as const).map((panel) => ({
      name: `Show ${panel}`,
      shortcut: '',
      run: () => useUI.getState().setPanel(panel),
    })),
  ];
  return (
    <>
      <button
        className="command-trigger"
        title="Search commands (Ctrl+Space)"
        aria-keyshortcuts="Control+Space"
        onClick={() => open('commands')}
      >
        <Search size={13} />
        <span>Search commands</span>
        <kbd>Ctrl Space</kbd>
      </button>
      <Command.Dialog
        open={mode !== null}
        onOpenChange={(value) => {
          if (!value) setMode(null);
        }}
        label={mode === 'files' ? 'Quick open file' : 'Command palette'}
        contentClassName="command-dialog glass glass--modal"
      >
        <div className="command-input-row">
          <Search size={17} />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={mode === 'files' ? 'Find a file…' : 'What would you like to do?'}
          />
          <kbd>esc</kbd>
        </div>
        <Command.List>
          <Command.Empty>No matches. Try a different search.</Command.Empty>
          <Command.Group heading={mode === 'files' ? 'PROJECT FILES' : 'WORKSPACE COMMANDS'}>
            {mode === 'files'
              ? Object.keys(s.tree)
                  .filter((path) => s.tree[path].kind === 'file')
                  .map((path) => (
                    <Command.Item
                      key={path}
                      value={path}
                      onSelect={() => {
                        s.open(path);
                        setMode(null);
                      }}
                    >
                      <FileCode2 size={15} />
                      <span>{path}</span>
                      <ArrowUpRight size={13} />
                    </Command.Item>
                  ))
              : commands.map((item) => (
                  <Command.Item
                    key={item.name}
                    value={item.name}
                    keywords={item.name === 'Manage projects' ? ['import', 'zip', 'projects'] : []}
                    onSelect={() => {
                      if (item.name === 'Search 3D objects') returnFocus.current = null;
                      setMode(null);
                      Promise.resolve(item.run()).catch((error: unknown) =>
                        useUI.getState().reportError(error),
                      );
                    }}
                  >
                    <Terminal size={14} />
                    <span>{item.name}</span>
                    {item.shortcut && <kbd>{item.shortcut}</kbd>}
                  </Command.Item>
                ))}
          </Command.Group>
        </Command.List>
        <div className="command-footer">
          <span>↑ ↓ navigate</span>
          <span>↵ select</span>
          <span>Code Atlas</span>
        </div>
      </Command.Dialog>
      {create && (
        <FormDialog
          title={`New ${create}`}
          label="Project path"
          onClose={() => setCreate(null)}
          onSubmit={(value) => {
            s.create(value, create === 'file' ? { kind: 'file', content: '' } : { kind: 'folder' });
            if (create === 'file') s.open(value);
          }}
        />
      )}
    </>
  );
}
