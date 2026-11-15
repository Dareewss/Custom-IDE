import { usePlaneView } from './plane-view';
import { Focus, RotateCcw, Scan } from 'lucide-react';
import { IconButton } from '../../shared/IconButton';
import { useOverview } from './store';
import { requestCamera } from './camera-actions';

export function CameraTools() {
  const classic = usePlaneView((s) => s.mode === 'classic');
  const selected = useOverview((s) => s.selectedNodeId);
  return (
    <div className="camera-tools" role="group" aria-label="Camera controls">
      <IconButton
        label={classic ? 'Fit all objects (Home)' : 'Fit all objects (F)'}
        onClick={() => requestCamera('fit-all')}
      >
        <Scan size={14} />
      </IconButton>
      <IconButton
        label={classic ? 'Fit selected object (F)' : 'Fit selected object (Shift+F)'}
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
