import type { CodeNode, CollectionEntry } from '../types';
import type { LayoutItem, Vec3 } from './types';
import { geometryTokens as tokens } from './tokens';

export function collectionEntries(node: CodeNode): CollectionEntry[] {
  return (
    node.meta.entries ??
    node.meta.preview?.map((value) => ({ value, valueType: 'other' as const })) ??
    []
  ).slice(0, tokens.maxCollectionItems);
}
export function collectionDimensions(node: CodeNode): { width: number; height: number } {
  const count = collectionEntries(node).length;
  const rows = node.meta.collectionKind === 'dict' ? 2 : 1;
  return {
    width: Math.max(
      tokens.leafWidth,
      count * (tokens.cellWidth + tokens.cellGap) - tokens.cellGap + tokens.inset,
    ),
    height: tokens.inset + rows * (tokens.cellHeight + tokens.cellGap),
  };
}
export interface CollectionCell {
  nodeId: string;
  index: number;
  part: 'key' | 'value';
  position: Vec3;
}
export function collectionCells(node: CodeNode, item: LayoutItem): CollectionCell[] {
  const entries = collectionEntries(node);
  const left = item.position[0] - ((entries.length - 1) * (tokens.cellWidth + tokens.cellGap)) / 2;
  const top = item.position[1] + item.size[1] / 2 - tokens.inset - tokens.cellHeight / 2;
  return entries.flatMap((entry, index): CollectionCell[] => {
    const x = left + index * (tokens.cellWidth + tokens.cellGap);
    const z = item.position[2] + tokens.cellOffset;
    return [
      ...(entry.key !== undefined
        ? [{ nodeId: node.id, index, part: 'key' as const, position: [x, top, z] as Vec3 }]
        : []),
      {
        nodeId: node.id,
        index,
        part: 'value',
        position: [
          x,
          top - (node.meta.collectionKind === 'dict' ? tokens.cellHeight + tokens.cellGap : 0),
          z,
        ],
      },
    ];
  });
}
