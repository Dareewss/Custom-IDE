import type { CodeNode, SourceRange } from '../types';
import type { FileLane, StructureLayout } from './structure-types';

/** A final column of one excludes that line; other columns include it. */
export function lineSpan(range: SourceRange): [number, number] {
  return [
    range.startLine,
    Math.max(range.startLine + 1, range.endLine + (range.endCol > 1 ? 1 : 0)),
  ];
}
export function sourceKnots(nodes: CodeNode[]): FileLane['knots'] {
  const events = new Map<number, number>([[1, 0]]);
  for (const node of nodes) {
    if (!node.range) continue;
    const [start, end] = lineSpan(node.range);
    // File extent supplies bounds, not coverage: truly empty gaps can compress.
    const weight = node.kind === 'file' ? 0 : 1;
    events.set(start, (events.get(start) ?? 0) + weight);
    events.set(end, (events.get(end) ?? 0) - weight);
  }
  const lines = [...events.keys()].sort((a, b) => a - b);
  let x = 0,
    occupied = 0;
  return lines.map((line, index) => {
    if (index) {
      const length = line - lines[index - 1];
      x += occupied ? Math.max(1, length) : Math.min(length, 1 + Math.log2(length));
    }
    occupied += events.get(line)!;
    return { line, x };
  });
}
export function mappedX(knots: FileLane['knots'], line: number): number {
  if (!Number.isFinite(line) || !knots.length) return 0;
  if (line <= knots[0].line) return knots[0].x;
  const last = knots[knots.length - 1];
  if (line >= last.line) return last.x;
  let low = 0,
    high = knots.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (knots[middle].line <= line) low = middle;
    else high = middle;
  }
  const a = knots[low],
    b = knots[high];
  return a.x + ((line - a.line) / (b.line - a.line)) * (b.x - a.x);
}
export function lineToX(layout: StructureLayout, fileId: string, line: number): number | null {
  const lane = layout.lanes.find((lane) => lane.fileId === fileId);
  return lane && Number.isFinite(line) ? mappedX(lane.knots, line) : null;
}
export function nodeRect(layout: StructureLayout, nodeId: string) {
  return layout.rects[nodeId] ?? null;
}
