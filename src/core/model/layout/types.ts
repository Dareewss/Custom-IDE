import type { CollectionCell } from './collections';
import type { BranchLane } from './control-flow';
import type { CodeEdge, CodeModel } from '../types';
import type { ModelIndexes } from '../indexes';
import type { ModelView } from '../view';

export type Vec3 = [number, number, number];
export interface LayoutItem {
  id: string;
  position: Vec3;
  size: Vec3;
  collapsed?: boolean;
}
export interface GraphLayout {
  items: Record<string, LayoutItem>;
  cells: Record<string, CollectionCell[]>;
  branches: Record<string, BranchLane[]>;
  externalCluster: LayoutItem | null;
  edges: LayoutEdge[];
  bounds: { min: Vec3; max: Vec3 };
}
export interface LayoutEdge {
  edge: CodeEdge;
  points: Vec3[];
  clusteredPoints: Vec3[];
}
export interface LayoutResponse {
  layout: GraphLayout;
  indexes: ModelIndexes;
  viewModel: CodeModel;
  ownerByNode: Record<string, string | null>;
  compactIds: string[];
  isolatedIds: Set<string> | null;
}
export interface LayoutRequest {
  model: CodeModel;
  projectId: string;
  revision: number;
  view: ModelView;
}
