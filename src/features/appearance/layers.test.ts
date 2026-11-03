import { expect, it } from 'vitest';
import { debugLayers } from './layers';

it('ignores layer debugging URLs in production', () => {
  expect(Object.values(debugLayers('?glassLayers=none', false))).toEqual([true, true, true, true]);
});
it('allows independent development layer inspection and defaults to all visible', () => {
  expect(debugLayers('?glassLayers=backing,orbs', true)).toEqual({
    backing: true,
    orbs: true,
    foreground: false,
    content: false,
  });
  expect(Object.values(debugLayers('', true))).toEqual([true, true, true, true]);
  expect(Object.values(debugLayers('?glassLayers=none', true))).toEqual([
    false,
    false,
    false,
    false,
  ]);
});
