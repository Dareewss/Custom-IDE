import { geometryTokens as tokens } from '../../core/model/layout/tokens';

/** Perspective projection uses view-axis depth, rather than Euclidean camera distance. */
export function labelPixels(depth: number, projectionY: number, height: number, parentScale = 1) {
  const raw =
    (tokens.labelSize * Math.max(1e-6, Math.abs(parentScale)) * Math.abs(projectionY) * height) /
    (2 * Math.max(1e-6, Math.abs(depth)));
  const pixels = Math.max(tokens.labelMinPixels, Math.min(tokens.labelMaxPixels, raw));
  return { pixels, scale: pixels / Math.max(1e-6, raw) };
}
