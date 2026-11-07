import coverage from './font-coverage.json';

export function fontSupports(codePoint: number): boolean {
  let low = 0;
  let high = coverage.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const [start, end] = coverage[middle];
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }
  return false;
}
/** Keep labels local/offline; unsupported glyphs retain an identifiable Unicode spelling. */
export function sceneLabel(name: string, limit = 40): string {
  const text = [...name.replaceAll(/\s/g, ' ')]
    .map((character) =>
      fontSupports(character.codePointAt(0)!)
        ? character
        : `\\u{${character.codePointAt(0)!.toString(16).toUpperCase()}}`,
    )
    .join('');
  const characters = [...text];
  return characters.length > limit
    ? `${characters.slice(0, Math.max(0, limit - 3)).join('')}...`
    : text;
}
