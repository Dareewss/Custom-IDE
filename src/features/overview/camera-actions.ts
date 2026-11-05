import { useOverview } from './store';

export type CameraAction =
  | 'fit-all'
  | 'fit-selection'
  | 'reset'
  | 'zoom-in'
  | 'zoom-out'
  | 'orbit-left'
  | 'orbit-right'
  | 'orbit-up'
  | 'orbit-down'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down';
export function requestCamera(action: CameraAction) {
  useOverview.setState((state) => ({
    cameraRequest: { action, sequence: (state.cameraRequest?.sequence ?? 0) + 1 },
  }));
}
export function cameraKey(key: string, shift: boolean): CameraAction | undefined {
  const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[
    key
  ];
  if (direction) return `${shift ? 'pan' : 'orbit'}-${direction}` as CameraAction;
  if (key === '+' || key === '=') return 'zoom-in';
  if (key === '-') return 'zoom-out';
  if (key.toLowerCase() === 'f') return 'fit-selection';
  if (key.toLowerCase() === 'r') return 'reset';
  if (key === 'Home') return 'fit-all';
}
