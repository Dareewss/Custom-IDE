import { useOverview } from './store';
import { useUI } from '../../shared/ui-store';
export function requestObjectSearch(): void {
  if (!['split', '3d'].includes(useUI.getState().layout)) useUI.getState().setLayout('split');
  useOverview.setState((s) => ({ searchFocusRequest: s.searchFocusRequest + 1 }));
}
