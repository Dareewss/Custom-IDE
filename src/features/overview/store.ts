import { create } from 'zustand';
import type { CodeModel, EdgeKind } from '../../core/model/types';
import type { ModelIndexes } from '../../core/model/indexes';
import type { GraphLayout, LayoutItem, Vec3 } from '../../core/model/layout/types';
import type { CodeNode } from '../../core/model/types';
import { emptyDiff, type ModelDiff } from '../../core/model/diff';
import type { CollectionCell } from '../../core/model/layout/collections';
import type { CameraAction } from './camera-actions';
import type { DepthPreset } from '../../core/model/view';
import type { SearchKind } from '../../core/model/search';
import type { IsolateView } from '../../core/model/isolate';

interface OverviewState {
  outlineVisible: boolean;
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
  cameraRequest: { action: CameraAction; sequence: number; point?: Vec3 } | null;
  viewModel: CodeModel | null;
  ownerByNode: Record<string, string | null>;
  collapsedIds: string[];
  compactIds: string[];
  depth: DepthPreset;
  searchQuery: string;
  searchKind: SearchKind;
  searchFocusRequest: number;
  isolate: IsolateView | null;
  isolatedIds: Set<string> | null;
  fitAfterView: boolean;
  diff: ModelDiff;
  ghosts: { node: CodeNode; item: LayoutItem; cells: CollectionCell[] }[];
  modelRevision: number;
  handledFocusSequence: number;
  analysisMs: number;
  layoutMs: number;
  focusRequest: { nodeId: string | null; sequence: number } | null;
}
export const useOverview = create<OverviewState>(() => ({
  outlineVisible: false,
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
  searchQuery: '',
  searchKind: 'all',
  searchFocusRequest: 0,
  isolate: null,
  isolatedIds: null,
  fitAfterView: false,
  diff: emptyDiff(),
  ghosts: [],
  modelRevision: 0,
  handledFocusSequence: 0,
  analysisMs: 0,
  layoutMs: 0,
  focusRequest: null,
}));
