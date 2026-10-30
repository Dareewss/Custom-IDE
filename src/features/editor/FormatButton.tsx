import { WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { formatActive } from './formatter';
import { useWorkspace } from '../explorer/store';
import { useSettings } from '../settings/store';
import { IconButton } from '../../shared/IconButton';

export function FormatButton() {
  const active = useWorkspace((s) => s.active);
  const [busy, setBusy] = useState(false);
  const settings = useSettings();
  return (
    <>
      <label className="format-save">
        <input
          type="checkbox"
          checked={settings.formatOnSave}
          onChange={(e) => settings.setFormatOnSave(e.target.checked)}
        />
        Format on save
      </label>
      <IconButton
        label={busy ? 'Formatting…' : 'Format Document'}
        disabled={!active || busy}
        onClick={() => {
          setBusy(true);
          void formatActive().finally(() => setBusy(false));
        }}
      >
        <WandSparkles size={14} />
      </IconButton>
      <span className="toolbar-divider" />
    </>
  );
}
