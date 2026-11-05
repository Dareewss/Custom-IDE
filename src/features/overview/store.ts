import { create } from 'zustand';
import type { CodeModel, EdgeKind } from '../../core/model/types';
import type { ModelIndexes } from '../../core/model/indexes';
import type { GraphLayout } from '../../core/model/layout/types';
import type { CameraAction } from './camera-actions';
import type { DepthPreset } from '../../core/model/view';

interface OverviewState {
  projectId: string | null;
  model: CodeModel | null;
  indexes: ModelIndexes | null;
  layout: GraphLayout | null;
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredDetail: string | null;
  hoveredEdgeId: string | null;
  edgeKinds: Record<EdgeKind, boolean>;
  showExternal: boolean;
  externalExpanded: boolean;
  layoutRevision: number;
  cameraRequest: { action: CameraAction; sequence: number } | null;
  viewModel: CodeModel | null;
  ownerByNode: Record<string, string | null>;
  collapsedIds: string[];
  compactIds: string[];
  depth: DepthPreset;
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
  hoveredDetail: null,
  hoveredEdgeId: null,
  edgeKinds: { import: true, call: true, inherits: true },
  showExternal: true,
  externalExpanded: false,
  layoutRevision: 0,
  cameraRequest: null,
  viewModel: null,
  ownerByNode: {},
  collapsedIds: [],
  compactIds: [],
  depth: 'all',
  focusRequest: null,
}));
