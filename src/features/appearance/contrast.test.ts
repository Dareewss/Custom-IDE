// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { materialAlphas } from './material';
type RGB = [number, number, number];
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const rgb = (input: string): RGB => {
  const hex = input.length === 4 ? '#' + [...input.slice(1)].map((x) => x + x).join('') : input;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
};
const over = (front: RGB, back: RGB, alpha: number): RGB =>
  front.map((value, i) => value * alpha + back[i] * (1 - alpha)) as RGB;
const luminance = (value: RGB) =>
  value
    .map((v) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a: RGB, b: RGB) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

for (const [index, theme] of (['dark', 'light'] as const).entries()) {
  it(`keeps ${theme} menus readable while workspace surfaces become fully transparent`, () => {
    const block = css.split(':root')[index + 1];
    const token = (name: string) => {
      const v = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
      if (!v) throw new Error(name);
      return v[1];
    };
    const alphas = materialAlphas(100, theme);
    expect(alphas.backing).toBe(0);
    expect(alphas.panel).toBe(0);
    expect(alphas.editor).toBe(0);
    const tint = token('glass-fg-rgb').split(' ').map(Number) as RGB;
    const background = over(tint, theme === 'dark' ? [255, 255, 255] : [0, 0, 0], alphas.elevated);
    for (const name of ['text', 'muted', 'danger', 'warning'])
      expect(contrast(rgb(token(name)), background)).toBeGreaterThanOrEqual(4.5);
  });
}
it('preserves slider direction and clamps invalid values without opacity on content', () => {
  for (const theme of ['dark', 'light'] as const) {
    expect(materialAlphas(NaN, theme)).toEqual(materialAlphas(0, theme));
    expect(materialAlphas(-1, theme)).toEqual(materialAlphas(0, theme));
    expect(materialAlphas(101, theme)).toEqual(materialAlphas(100, theme));
    for (let slider = 0; slider <= 100; slider++) {
      const a = materialAlphas(slider, theme),
        b = materialAlphas(slider + 1, theme);
      for (const key of ['backing', 'panel', 'editor'] as const) {
        expect(a[key]).toBeGreaterThanOrEqual(0);
        expect(a[key]).toBeLessThan(1);
        expect(b[key]).toBeLessThanOrEqual(a[key]);
      }
    }
  }
});
