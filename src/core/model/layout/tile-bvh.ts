import type { StructureTile } from './structure-types';

export interface TileBvh {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  children?: [TileBvh, TileBvh];
  indices?: number[];
}
/** Worker-built spatial BVH; leaves contain at most eight source tiles. */
export function buildTileBvh(tiles: StructureTile[], indices: number[]): TileBvh | null {
  if (!indices.length) return null;
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const index of indices) {
    const tile = tiles[index];
    bounds.minX = Math.min(bounds.minX, tile.x);
    bounds.maxX = Math.max(bounds.maxX, tile.x + tile.width);
    bounds.minY = Math.min(bounds.minY, tile.y);
    bounds.maxY = Math.max(bounds.maxY, tile.y + tile.height);
  }
  if (indices.length <= 8) return { ...bounds, indices };
  const horizontal = bounds.maxX - bounds.minX >= bounds.maxY - bounds.minY;
  const sorted = [...indices].sort((a, b) =>
    horizontal
      ? tiles[a].x + tiles[a].width / 2 - tiles[b].x - tiles[b].width / 2 || a - b
      : tiles[a].y - tiles[b].y || a - b,
  );
  const middle = sorted.length >>> 1;
  return {
    ...bounds,
    children: [
      buildTileBvh(tiles, sorted.slice(0, middle))!,
      buildTileBvh(tiles, sorted.slice(middle))!,
    ],
  };
}
export function pickTile(
  tree: TileBvh | null,
  tiles: StructureTile[],
  x: number,
  y: number,
  insetX = 0,
  insetY = 0,
): number | null {
  if (!tree || x < tree.minX || x > tree.maxX || y < tree.minY || y > tree.maxY) return null;
  if (tree.children)
    return (
      pickTile(tree.children[0], tiles, x, y, insetX, insetY) ??
      pickTile(tree.children[1], tiles, x, y, insetX, insetY)
    );
  for (const index of tree.indices ?? []) {
    const tile = tiles[index];
    const dx = Math.min(insetX, tile.width * 0.2),
      dy = Math.min(insetY, tile.height * 0.2);
    if (
      x >= tile.x + dx &&
      x <= tile.x + tile.width - dx &&
      y >= tile.y + dy &&
      y <= tile.y + tile.height - dy
    )
      return index;
  }
  return null;
}
