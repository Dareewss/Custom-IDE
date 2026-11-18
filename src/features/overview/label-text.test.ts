import { expect, it } from 'vitest';
import { fontSupports, sceneLabel } from './label-text';

it('keeps supported source names intact and bounds long scene labels', () => {
  expect(sceneLabel('main.py')).toBe('main.py');
  expect(sceneLabel('Counter.render')).toBe('Counter.render');
  expect(sceneLabel('x'.repeat(100), 20)).toBe(`${'x'.repeat(17)}...`);
  for (const character of 'abcdefghijklmnopqrstuvwxyz0123456789_./\\{}')
    expect(fontSupports(character.codePointAt(0)!)).toBe(true);
});
it('represents unsupported Unicode locally without losing the underlying source name', () => {
  const name = '😀.py';
  expect(sceneLabel(name)).toBe('\\u{1F600}.py');
  expect(name).toBe('😀.py');
  const text = sceneLabel('a\n\tb');
  expect(text).toBe('a  b');
  for (const character of sceneLabel('世界😀.py'))
    expect(fontSupports(character.codePointAt(0)!)).toBe(true);
});
