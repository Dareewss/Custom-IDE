import type { CodeModel, NodeKind } from '../types';

export type PlaneLevel = 0 | 1 | 2 | 3 | 4;
export const planeNames = ['Files', 'Classes', 'Functions', 'Control flow', 'Values'] as const;
export function planeLevel(kind: NodeKind): PlaneLevel | null {
  if (kind === 'external') return null;
  if (kind === 'file') return 0;
  if (kind === 'class') return 1;
  if (kind === 'function' || kind === 'method') return 2;
  if (kind === 'loop' || kind === 'condition') return 3;
  return 4;
}
export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
  level: PlaneLevel;
  row: number;
  lane: number;
}
export interface StructureTile extends NodeRect {
  parentId: string | null;
  id: string;
  nodeIds: string[];
  fileId: string;
  startLine: number;
  endLine: number;
}
export interface FileLane {
  fileId: string;
  nodeId: string;
  name: string;
  index: number;
  width: number;
  knots: { line: number; x: number }[];
}
export interface StructureLayout {
  lanes: FileLane[];
  planes: { level: PlaneLevel; name: string; rows: number; firstRow: number }[];
  tiles: StructureTile[];
  rects: Record<string, StructureTile>;
  width: number;
  height: number;
  pixelsPerUnit: number;
}
export interface StructureOptions {
  pixelsPerUnit?: number;
}
/** The requested strategy boundary is plain worker data, independent of scene/parser types. */
export interface LayoutStrategy {
  id: string;
  layout(model: CodeModel, options?: StructureOptions, previous?: StructureLayout): StructureLayout;
}
