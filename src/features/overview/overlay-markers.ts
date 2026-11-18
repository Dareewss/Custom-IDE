import type { CodeModel } from '../../core/model/types';
import type { ModelIndexes } from '../../core/model/indexes';
import { nodeAtPosition } from '../../core/model/indexes';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
import { nodeRect, lineToX } from '../../core/model/layout/line-map';
export type OverlayMarker = {
  id: string;
  kind: 'badge' | 'outline' | 'glow' | 'cursor';
  severity: 'error' | 'warning' | 'breakpoint' | 'info';
  label: string;
} & (
  | { nodeId: string; fileId?: never; line?: never }
  | { nodeId?: never; fileId: string; line: number }
);
export function staticMarkers(
  model: CodeModel,
  breakpoints: Record<string, number[]>,
): OverlayMarker[] {
  const markers: OverlayMarker[] = model.issues.map((issue, i) => ({
    id: `error:${issue.fileId}:${i}`,
    kind: 'badge',
    severity: 'error',
    label: issue.message,
    fileId: issue.fileId,
    line: issue.range.startLine,
  }));
  for (const node of model.nodes)
    if (node.meta.hasError)
      markers.push({
        id: `recovered:${node.id}`,
        kind: 'outline',
        severity: 'error',
        label: 'Recovered syntax',
        nodeId: node.id,
      });
  for (const edge of model.edges)
    if (!edge.resolved)
      markers.push({
        id: `warning:${edge.id}`,
        kind: 'badge',
        severity: 'warning',
        label: `Unresolved ${edge.kind} (${Math.round(edge.confidence * 100)}% confidence)`,
        ...(edge.source
          ? { fileId: edge.source.fileId, line: edge.source.range.startLine }
          : { nodeId: edge.from }),
      });
  for (const [fileId, lines] of Object.entries(breakpoints))
    for (const line of lines)
      if (Number.isSafeInteger(line) && line > 0)
        markers.push({
          id: `breakpoint:${fileId}:${line}`,
          kind: 'badge',
          severity: 'breakpoint',
          label: `Breakpoint ${fileId}:${line}`,
          fileId,
          line,
        });
  return markers;
}
export function resolveMarkers(
  markers: OverlayMarker[],
  layout: StructureLayout,
  indexes: ModelIndexes | null,
  owners: Record<string, string | null>,
  visible: StructureTile[],
) {
  const shown = new Set(visible.map((t) => t.id));
  return markers.flatMap((marker) => {
    const id =
      marker.nodeId ??
      (indexes ? nodeAtPosition(indexes, marker.fileId, marker.line)?.id : undefined);
    const tile = id ? (nodeRect(layout, id) ?? nodeRect(layout, owners[id] ?? '')) : null;
    if (!tile || !shown.has(tile.id)) return [];
    const x = marker.line !== undefined ? lineToX(layout, marker.fileId, marker.line) : null;
    return [{ marker, tile, x: x ?? tile.x + tile.width }];
  });
}
