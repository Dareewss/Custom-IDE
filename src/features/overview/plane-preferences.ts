import type { Vec3 } from '../../core/model/layout/types';
import { nodeKinds } from '../../core/model/types';
import type { SearchKind } from '../../core/model/search';
export interface PlanePose {
  position: Vec3;
  target: Vec3;
  zoom: number;
  rowScale?: number;
}
export interface PlanePreferences {
  mode: 'flat' | 'layers' | 'classic';
  gap: number;
  edges: 'none' | 'context' | 'all';
  imports: boolean;
  rootId: string | null;
  levels: boolean[];
  extrude: boolean;
  query: string;
  kind: SearchKind;
  cameras: { flat: PlanePose | null; layers: PlanePose | null };
}
export function parsePlanePreferences(value: unknown): PlanePreferences {
  const d = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const pose = (value: unknown): PlanePose | null => {
    if (!value || typeof value !== 'object') return null;
    const p = value as Record<string, unknown>,
      vector = (v: unknown): v is Vec3 =>
        Array.isArray(v) &&
        v.length === 3 &&
        v.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e7);
    return vector(p.position) &&
      vector(p.target) &&
      Math.hypot(...p.position.map((n, i) => n - (p.target as Vec3)[i])) > 0.01 &&
      typeof p.zoom === 'number' &&
      Number.isFinite(p.zoom) &&
      p.zoom >= 0.5 &&
      p.zoom <= 500
      ? {
          position: p.position,
          target: p.target,
          zoom: p.zoom,
          ...(typeof p.rowScale === 'number' &&
          Number.isFinite(p.rowScale) &&
          p.rowScale > 0 &&
          p.rowScale < 1000
            ? { rowScale: p.rowScale }
            : {}),
        }
      : null;
  };
  const cameras =
    d.cameras && typeof d.cameras === 'object' ? (d.cameras as Record<string, unknown>) : {};
  return {
    mode: d.mode === 'layers' || d.mode === 'classic' ? d.mode : 'flat',
    gap: typeof d.gap === 'number' && Number.isFinite(d.gap) ? Math.max(1, Math.min(12, d.gap)) : 5,
    edges: d.edges === 'context' || d.edges === 'all' ? d.edges : 'none',
    imports: d.imports === true,
    rootId: typeof d.rootId === 'string' && d.rootId.length <= 4096 ? d.rootId : null,
    levels: Array.from({ length: 5 }, (_, i) =>
      Array.isArray(d.levels) && typeof d.levels[i] === 'boolean' ? d.levels[i] : true,
    ),
    extrude: d.extrude === true,
    query: typeof d.query === 'string' ? d.query.slice(0, 500) : '',
    kind:
      typeof d.kind === 'string' && nodeKinds.includes(d.kind as (typeof nodeKinds)[number])
        ? (d.kind as SearchKind)
        : 'all',
    cameras: { flat: pose(cameras.flat), layers: pose(cameras.layers) },
  };
}
