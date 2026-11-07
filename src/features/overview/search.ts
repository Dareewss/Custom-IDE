import { useMemo } from 'react';
import type { CodeModel } from '../../core/model/types';
import { searchModel } from '../../core/model/search';
import { useOverview } from './store';
import { useUI } from '../../shared/ui-store';
import type { SceneColors } from './scene-tokens';

export function requestObjectSearch(): void {
  if (!['split', '3d'].includes(useUI.getState().layout)) useUI.getState().setLayout('split');
  useOverview.setState((s) => ({ searchFocusRequest: s.searchFocusRequest + 1 }));
}
export function useGraphSearch(model: CodeModel) {
  const full = useOverview((s) => s.model),
    query = useOverview((s) => s.searchQuery),
    kind = useOverview((s) => s.searchKind);
  return useMemo(() => searchModel(full ?? model, query, kind), [full, model, query, kind]);
}
export function mutedColors(colors: SceneColors): SceneColors {
  return {
    ...colors,
    nodeOpacity: colors.nodeOpacity * colors.searchDim,
    containerOpacity: colors.containerOpacity * colors.searchDim,
    activeOpacity: colors.activeOpacity * colors.searchDim,
    rimOpacity: colors.rimOpacity * colors.searchDim,
    valueOpacity: colors.valueOpacity * colors.searchDim,
  };
}
