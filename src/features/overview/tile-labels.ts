import { Color } from 'three';
import type { CodeNode } from '../../core/model/types';
import type { StructureTile } from '../../core/model/layout/structure-types';
import type { SceneColors } from './scene-tokens';
import { sceneLabel } from './label-text';

export const tileLabelPixels = 12;
export const tileLabelBudget = 300;
export function tileColor(level: number, colors: SceneColors, active = false, dim = false): string {
  const color = active
    ? colors.active
    : [colors.other, colors.classFill, colors.functionFill, colors.active, colors.fill][level];
  return dim && !active ? `#${new Color(color).multiplyScalar(0.2).getHexString()}` : color;
}
/** Colors are linear inside Three; choose the higher WCAG contrast against the actual tile. */
export function tileTextColor(background: string): string {
  const color = new Color(background);
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b > 0.179 ? '#000000' : '#ffffff';
}
export function tileLabel(
  tile: StructureTile,
  node: CodeNode | undefined,
  pixels: number,
): string | null {
  if (pixels < 88 || !node) return null;
  const glyph = ['#', 'C', 'f', '?', '='][tile.level];
  const metric = ` ${tile.endLine - tile.startLine}L`;
  const capacity = Math.floor((pixels - 10) / (tileLabelPixels * 0.6));
  const name = tile.nodeIds.length > 1 ? `+${tile.nodeIds.length}` : node.name;
  return `${glyph} ${sceneLabel(name, Math.max(4, capacity - metric.length - 2))}${metric}`;
}
