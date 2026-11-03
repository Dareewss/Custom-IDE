import { WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { formatActive } from './formatter';
import { useWorkspace } from '../explorer/store';
import { IconButton } from '../../shared/IconButton';

export function FormatButton() {
  const active = useWorkspace((s) => s.active);
  const [busy, setBusy] = useState(false);
  return (
    <>
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
