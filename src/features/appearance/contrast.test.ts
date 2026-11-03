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
  const block = css.split(':root')[index + 1];
  const value = (token: string) => {
    const match = block.match(new RegExp(`--${token}:\\s*([^;]+);`));
    if (!match) throw new Error(`Missing ${token}`);
    return match[1];
  };
  const tint = value('glass-fg-rgb').split(' ').map(Number) as RGB;
  const worst: RGB = theme === 'dark' ? [255, 255, 255] : [0, 0, 0];
  for (const amount of [0, 50, 100]) {
    const alphas = materialAlphas(amount, theme);
    it(`${theme} ${amount}% UI and controls keep AA over the brightest possible orb`, () => {
      const base = over(tint, worst, alphas.panel);
      // Worst grain extreme plus maximum sheen; include existing hover/active fills.
      const backgrounds = [base, over([255, 255, 255], base, theme === 'dark' ? 0.025 : 0)];
      for (const bg of backgrounds)
        for (const overlay of [0, 0.15]) {
          const under = over(theme === 'dark' ? [132, 221, 99] : [107, 170, 117], bg, overlay);
          const grain = over(theme === 'dark' ? [255, 255, 255] : [0, 0, 0], under, 0.0175);
          for (const token of ['text', 'muted', 'danger', 'warning', 'accent'])
            expect(
              contrast(
                rgb(token === 'accent' && theme === 'dark' ? '#cbff4d' : value(token)),
                grain,
              ),
              `${token} hover=${overlay}`,
            ).toBeGreaterThanOrEqual(4.5);
        }
      expect(
        contrast(rgb(value('on-accent')), rgb(theme === 'dark' ? '#cbff4d' : value('accent'))),
      ).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme} ${amount}% code and console keep AA with selection and debugger overlays`, () => {
      const base = over(tint, worst, alphas.editor);
      for (const overlay of [
        'none',
        'code-selection',
        'code-line-highlight',
        'code-bracket-fill',
        'execution',
      ]) {
        const color =
          overlay === 'execution' ? '#e8c56818' : overlay === 'none' ? '#00000000' : value(overlay);
        let bg = over(rgb(color), base, parseInt(color.slice(7), 16) / 255);
        bg = over(
          theme === 'dark' ? [255, 255, 255] : [0, 0, 0],
          bg,
          theme === 'dark' ? 0.043 : 0.0175,
        );
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
        ])
          expect(
            contrast(rgb(value(`code-${token}`)), bg),
            `${token} on ${overlay}`,
          ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
}
it('clamps invalid values and keeps every normal material translucent and monotonic', () => {
  for (const theme of ['dark', 'light'] as const) {
    expect(materialAlphas(NaN, theme)).toEqual(materialAlphas(0, theme));
    expect(materialAlphas(-1, theme)).toEqual(materialAlphas(0, theme));
    expect(materialAlphas(101, theme)).toEqual(materialAlphas(100, theme));
    for (let slider = 0; slider <= 100; slider++) {
      const v = materialAlphas(slider, theme),
        next = materialAlphas(slider + 1, theme);
      for (const key of ['backing', 'panel', 'editor', 'elevated'] as const) {
        expect(v[key]).toBeGreaterThan(0);
        expect(v[key]).toBeLessThan(1);
        expect(next[key]).toBeLessThanOrEqual(v[key]);
      }
      expect(v.editor).toBeGreaterThanOrEqual(v.panel);
      expect(v.elevated).toBeGreaterThanOrEqual(v.editor);
    }
  }
});
