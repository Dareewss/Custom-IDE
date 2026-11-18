import type { CodeNode } from '../types';
import type { LayoutItem, Vec3 } from './types';
import { geometryTokens as tokens } from './tokens';

export function functionWidth(node: CodeNode, parameters: number): number {
  const lines = node.range ? Math.max(1, node.range.endLine - node.range.startLine + 1) : 1;
  const lineWidth = Math.min(
    tokens.functionMaxWidth,
    tokens.functionMinWidth + Math.sqrt(lines) * tokens.functionLineScale,
  );
  return Math.max(lineWidth, parameters * tokens.portGap + tokens.inset);
}
export function headerPosition(item: LayoutItem): Vec3 {
  return [
    item.position[0],
    item.position[1] + item.size[1] / 2 - tokens.labelInset,
    item.position[2],
  ];
}
