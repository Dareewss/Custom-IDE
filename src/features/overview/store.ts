import { create } from 'zustand';
import type { CodeModel } from '../../core/model/types';
import type { ModelIndexes } from '../../core/model/indexes';
import type { GraphLayout } from '../../core/model/layout/types';

interface OverviewState {
  projectId: string | null;
  model: CodeModel | null;
  indexes: ModelIndexes | null;
  layout: GraphLayout | null;
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusRequest: { nodeId: string | null; sequence: number } | null;
}
export const useOverview = create<OverviewState>(() => ({
  projectId: null,
  model: null,
  indexes: null,
  layout: null,
  loading: false,
  error: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  focusRequest: null,
}));
