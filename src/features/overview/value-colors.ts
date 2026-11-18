import type { ValueKind } from '../../core/model/types';
import type { SceneColors } from './scene-tokens';

export function valueColor(kind: ValueKind | undefined, colors: SceneColors): string {
  return kind === 'number'
    ? colors.number
    : kind === 'string'
      ? colors.string
      : kind === 'bool'
        ? colors.bool
        : colors.other;
}
