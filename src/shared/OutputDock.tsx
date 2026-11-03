import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { Terminal } from 'lucide-react';
import { useUI, type PanelTab } from './ui-store';
import { useRunner } from '../features/runner/store';

export function OutputDock({
  content,
  docked,
}: {
  content: Record<PanelTab, ReactNode>;
  docked: boolean;
}) {
  const ui = useUI();
  const status = useRunner((s) => s.status);
  return (
    <GlassPanel
      as="section"
      variant="editor"
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
      </div>
      <div className="panel-body" role="tabpanel" aria-label={ui.panel}>
        {content[ui.panel]}
      </div>
    </GlassPanel>
  );
}
