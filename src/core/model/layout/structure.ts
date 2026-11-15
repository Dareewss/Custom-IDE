import type { CodeModel, CodeNode } from '../types';
import { lineSpan, mappedX, sourceKnots } from './line-map';
import {
  planeLevel,
  planeNames,
  type LayoutStrategy,
  type PlaneLevel,
  type StructureLayout,
  type StructureOptions,
  type StructureTile,
} from './structure-types';

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const dictionary = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

export function structureLayout(
  model: CodeModel,
  options: StructureOptions = {},
  previous?: StructureLayout,
): StructureLayout {
  const scale = options.pixelsPerUnit ?? 24;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid structure layout scale.');
  const pixelsPerUnit = Math.max(0.05, Math.min(1024, scale));
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const nodesByFile = new Map<string, CodeNode[]>();
  for (const node of model.nodes)
    if (node.fileId) {
      const nodes = nodesByFile.get(node.fileId) ?? [];
      nodes.push(node);
      nodesByFile.set(node.fileId, nodes);
    }
  const oldOrder = new Map(previous?.lanes.map((lane) => [lane.fileId, lane.index]));
  const files = model.nodes
    .filter((node) => node.kind === 'file')
    .sort(
      (a, b) =>
        (oldOrder.get(a.fileId!) ?? Infinity) - (oldOrder.get(b.fileId!) ?? Infinity) ||
        compare(a.id, b.id),
    );
  const lanes = files.map((file, index) => {
    const knots = sourceKnots(nodesByFile.get(file.fileId!) ?? []);
    return {
      fileId: file.fileId!,
      nodeId: file.id,
      name: file.name,
      index,
      width: Math.max(1, knots[knots.length - 1]?.x ?? 1),
      knots,
    };
  });
  const counts = new Map<string, number[]>();
  const rowByNode = new Map<string, number>();
  const rows = [1, 1, 1, 1, 1];
  for (const node of model.nodes) {
    const chain: CodeNode[] = [],
      seen = new Set<string>();
    let current: CodeNode | undefined = node;
    while (current && !counts.has(current.id)) {
      if (seen.has(current.id)) throw new Error('Cyclic source containment.');
      seen.add(current.id);
      chain.push(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    let depth = current ? counts.get(current.id)! : [0, 0, 0, 0, 0];
    for (const entry of chain.reverse()) {
      depth = [...depth];
      const level = planeLevel(entry.kind);
      if (level !== null) {
        rowByNode.set(entry.id, depth[level]);
        rows[level] = Math.max(rows[level], ++depth[level]);
      }
      counts.set(entry.id, depth);
    }
  }
  let firstRow = 0;
  const planes = planeNames.map((name, level) => {
    const plane = { level: level as PlaneLevel, name, rows: rows[level], firstRow };
    firstRow += rows[level];
    return plane;
  });
  const rects = dictionary<StructureTile>();
  const tiles: StructureTile[] = [];
  for (const lane of lanes) {
    const groups = new Map<string, StructureTile[]>();
    for (const node of nodesByFile.get(lane.fileId) ?? []) {
      const level = planeLevel(node.kind);
      if (level === null || !node.range) continue;
      const row = rowByNode.get(node.id)!;
      const [startLine, endLine] = lineSpan(node.range);
      const x = mappedX(lane.knots, startLine);
      const tile: StructureTile = {
        id: node.id,
        parentId: node.parentId,
        nodeIds: [node.id],
        fileId: lane.fileId,
        level,
        row,
        lane: lane.index,
        x,
        y: -(planes[level].firstRow + row + 1),
        width: Math.max(0, mappedX(lane.knots, endLine) - x),
        height: 0.84,
        startLine,
        endLine,
      };
      const key = `${level}:${row}`,
        group = groups.get(key) ?? [];
      group.push(tile);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => a.x - b.x || a.width - b.width || compare(a.id, b.id));
      let merged: StructureTile | undefined;
      const flush = () => {
        if (!merged) return;
        merged.nodeIds.sort(compare);
        if (merged.nodeIds.length > 1) merged.id = `tiles:${JSON.stringify(merged.nodeIds)}`;
        tiles.push(merged);
        for (const id of merged.nodeIds) rects[id] = merged;
      };
      for (const tile of group) {
        const end = merged ? merged.x + merged.width : -Infinity;
        const overlap = tile.x < end - 1e-8;
        const tooSmall =
          merged &&
          merged.parentId === tile.parentId &&
          Math.min(tile.width, merged.width) * pixelsPerUnit < 12 &&
          (tile.x - end) * pixelsPerUnit <= 2;
        if (merged && (overlap || tooSmall)) {
          merged.width = Math.max(end, tile.x + tile.width) - merged.x;
          merged.startLine = Math.min(merged.startLine, tile.startLine);
          merged.endLine = Math.max(merged.endLine, tile.endLine);
          merged.nodeIds.push(...tile.nodeIds);
        } else {
          flush();
          merged = { ...tile, nodeIds: [...tile.nodeIds] };
        }
      }
      flush();
    }
  }
  tiles.sort(
    (a, b) =>
      a.lane - b.lane || a.level - b.level || a.row - b.row || a.x - b.x || compare(a.id, b.id),
  );
  return {
    lanes,
    planes,
    tiles,
    rects,
    width: Math.max(1, ...lanes.map((lane) => lane.width)),
    height: firstRow,
    pixelsPerUnit,
  };
}
export const structureStrategy: LayoutStrategy = { id: 'structure', layout: structureLayout };
