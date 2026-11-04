import { Edit, type Point } from 'web-tree-sitter';

export function sourcePoint(source: string, index: number): Point {
  let row = 0;
  let lineStart = 0;
  for (let i = 0; i < index; i++)
    if (source.charCodeAt(i) === 10) {
      row++;
      lineStart = i + 1;
    }
  return { row, column: index - lineStart };
}

/** A single replacement spanning the changed UTF-16 region. */
export function sourceEdit(before: string, after: string): Edit | undefined {
  if (before === after) return;
  let first = 0;
  const common = Math.min(before.length, after.length);
  while (first < common && before[first] === after[first]) first++;
  // Never place an edit boundary between the halves of an astral code point.
  if (first > 0 && /[\uDC00-\uDFFF]/.test(before[first] ?? after[first] ?? '')) first--;
  let suffix = 0;
  while (
    suffix < common - first &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  )
    suffix++;
  if (suffix && /[\uDC00-\uDFFF]/.test(before[before.length - suffix])) suffix--;
  const oldEndIndex = before.length - suffix;
  const newEndIndex = after.length - suffix;
  return new Edit({
    startIndex: first,
    oldEndIndex,
    newEndIndex,
    startPosition: sourcePoint(before, first),
    oldEndPosition: sourcePoint(before, oldEndIndex),
    newEndPosition: sourcePoint(after, newEndIndex),
  });
}
