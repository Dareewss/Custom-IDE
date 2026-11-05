import { Focus, RotateCcw, Scan } from 'lucide-react';
import { IconButton } from '../../shared/IconButton';
import { useOverview } from './store';
import { requestCamera } from './camera-actions';

export function CameraTools() {
  const selected = useOverview((s) => s.selectedNodeId);
  return (
    <div className="camera-tools" role="group" aria-label="Camera controls">
      <IconButton label="Fit all objects (Home)" onClick={() => requestCamera('fit-all')}>
        <Scan size={14} />
      </IconButton>
      <IconButton
        label="Fit selected object (F)"
        disabled={!selected}
        onClick={() => requestCamera('fit-selection')}
      >
        <Focus size={14} />
      </IconButton>
      <IconButton label="Reset camera (R)" onClick={() => requestCamera('reset')}>
        <RotateCcw size={14} />
      </IconButton>
    </div>
  );
}
