import type { EdgeKind, NodeKind } from './types';

function occurrenceIndex(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid occurrence index.');
  return value;
}

// Encoding the tuple avoids separator collisions and does not depend on source lines.
export function stableNodeId(
  fileId: string,
  kind: NodeKind,
  qualifiedName: string,
  occurrence = 0,
): string {
  if (!fileId || !qualifiedName)
    throw new Error('Node identity requires a file and qualified name.');
  return `n:${JSON.stringify([fileId, kind, qualifiedName, occurrenceIndex(occurrence)])}`;
}
export function stableEdgeId(kind: EdgeKind, from: string, to: string, occurrence = 0): string {
  if (!from || !to) throw new Error('Edge identity requires both endpoints.');
  return `e:${JSON.stringify([kind, from, to, occurrenceIndex(occurrence)])}`;
}
