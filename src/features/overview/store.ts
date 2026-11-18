import type { StructureLayout } from '../../core/model/layout/structure-types';
import { create } from 'zustand';
import type { CodeModel } from '../../core/model/types';
import type { ModelIndexes } from '../../core/model/indexes';
import type { Vec3 } from '../../core/model/layout/types';
import { emptyDiff, type ModelDiff } from '../../core/model/diff';
import type { CameraAction } from './camera-actions';
import type { DepthPreset } from '../../core/model/view';
import type { SearchKind } from '../../core/model/search';
import type { IsolateView } from '../../core/model/isolate';

interface OverviewState {
  structure: StructureLayout | null;
  outlineVisible: boolean;
  projectId: string | null;
  model: CodeModel | null;
  indexes: ModelIndexes | null;
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredDetail: string | null;
  hoveredEdgeId: string | null;
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
  modelRevision: number;
  handledFocusSequence: number;
  analysisMs: number;
  layoutMs: number;
  focusRequest: { nodeId: string | null; sequence: number } | null;
}
export const useOverview = create<OverviewState>(() => ({
  structure: null,
  outlineVisible: false,
  projectId: null,
  model: null,
  indexes: null,
  loading: false,
  error: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  hoveredDetail: null,
  hoveredEdgeId: null,
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
  modelRevision: 0,
  handledFocusSequence: 0,
  analysisMs: 0,
  layoutMs: 0,
  focusRequest: null,
}));
