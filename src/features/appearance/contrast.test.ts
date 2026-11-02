// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

type RGB = [number, number, number];
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const over = (front: RGB, back: RGB, alpha: number): RGB =>
  front.map((value, i) => value * alpha + back[i] * (1 - alpha)) as RGB;
const luminance = (value: RGB) =>
  value
    .map((v) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);

for (const [index, name] of ['dark', 'light'].entries()) {
  it(`keeps ${name} code, comments and output AA even over the worst possible backdrop`, () => {
    const block = css.split(':root')[index + 1];
    const value = (token: string) => {
      const match = block.match(new RegExp(`--${token}:\\s*([^;]+);`));
      if (!match) throw new Error(`Missing contrast token ${token}`);
      return match[1];
    };
    const scrim = value('text-scrim').split(' ').map(Number) as RGB;
    const background = over(
      scrim,
      index === 0 ? [255, 255, 255] : [0, 0, 0],
      Number(value('text-scrim-opacity')),
    );
    // Include selection and current-line tint on top of the readability floor.
    for (const overlay of ['code-selection', 'code-line-highlight']) {
      const tint = value(overlay);
      const selected = over(rgb(tint), background, parseInt(tint.slice(7), 16) / 255);
      for (const token of [
        'foreground',
        'comment',
        'keyword',
        'string',
        'number',
        'predefined',
        'type',
        'operator',
        'annotation',
        'error',
      ]) {
        const a = luminance(rgb(value(`code-${token}`)));
        const b = luminance(selected);
        expect(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          `${name} ${token} on ${overlay}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
