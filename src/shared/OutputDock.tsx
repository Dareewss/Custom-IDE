import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { Terminal, X, WandSparkles, Save, Command, ArrowUpRight } from 'lucide-react';
import { useUI, type PanelTab } from './ui-store';
import { IconButton } from './IconButton';
import { useRunner } from '../features/runner/store';
import { formatActive } from '../features/editor/formatter';
import { persistCurrent } from '../features/projects/persistence';
import { useWorkspace } from '../features/explorer/store';
import { languageForPath } from '../core/language/adapter';

export function OutputDock({
  content,
  docked,
}: {
  content: Record<PanelTab, ReactNode>;
  docked: boolean;
}) {
  const ui = useUI();
  const status = useRunner((s) => s.status);
  const active = useWorkspace((s) => s.active);
  return (
    <GlassPanel
      as="section"
      className={`bottom-panel output-card ${docked ? 'docked' : ''}`}
      aria-label="Output panel"
    >
      {docked && (
        <div className="dock-title">
          <span>
            <Terminal size={16} />
            Workbench
          </span>
          <span className={`runtime-badge ${status}`}>
            <i />
            {status === 'idle' ? 'Ready' : status[0].toUpperCase() + status.slice(1)}
          </span>
        </div>
      )}
      <div className="panel-header">
        <div className="panel-tabs" role="tablist" aria-label="Output views">
          {(['Console', 'Problems', 'Variables', 'Call Stack'] as PanelTab[]).map((tab) => (
            <button
              role="tab"
              key={tab}
              aria-selected={ui.panel === tab}
              onClick={() => ui.setPanel(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <IconButton label="Close bottom panel" onClick={ui.toggleBottom}>
          <X size={14} />
        </IconButton>
      </div>
      <div className="panel-body" role="tabpanel" aria-label={ui.panel}>
        {content[ui.panel]}
      </div>
      {docked && (
        <div className="dock-quick-actions">
          <div className="quick-heading">
            Quick actions
            <button onClick={() => ui.openPalette('commands')} aria-label="Open all commands">
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="quick-action-grid">
            <button
              disabled={!active || !languageForPath(active)?.formatter}
              onClick={() => void formatActive()}
            >
              <WandSparkles size={13} />
              Format file
            </button>
            <button onClick={() => void persistCurrent().catch(() => {})}>
              <Save size={13} />
              Save workspace
            </button>
            <button onClick={() => ui.openPalette('files')}>
              <ArrowUpRight size={13} />
              Open a file
            </button>
            <button onClick={() => ui.openPalette('commands')}>
              <Command size={13} />
              All commands
            </button>
          </div>
          <div className="local-notice">
            <i />
            Your projects stay on this device.
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
