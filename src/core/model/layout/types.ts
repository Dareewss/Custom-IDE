import type { CollectionCell } from './collections';
import type { BranchLane } from './control-flow';
import type { CodeEdge } from '../types';
import type { ModelIndexes } from '../indexes';

export type Vec3 = [number, number, number];
export interface LayoutItem {
  id: string;
  position: Vec3;
  size: Vec3;
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
}
