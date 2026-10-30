import { expect, it } from 'vitest';
import { defaultSettings, parseSettings } from './model';
it('preserves transparency endpoints and rejects invalid persisted values', () => {
  expect(parseSettings({ backgroundTransparency: 0 }).backgroundTransparency).toBe(0);
  expect(parseSettings({ backgroundTransparency: 100 }).backgroundTransparency).toBe(100);
  expect(parseSettings({ backgroundTransparency: 53 }).backgroundTransparency).toBe(53);
  for (const value of [-1, 101, NaN, '50', null, 0.5])
    expect(parseSettings({ backgroundTransparency: value }).backgroundTransparency).toBe(0);
});
it('round-trips valid settings', () => {
  const settings = { ...defaultSettings, fontSize: 18, theme: 'light', wordWrap: true };
  expect(parseSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
});
it('rejects invalid persisted values', () => {
  expect(
    parseSettings({
      fontSize: -1,
      tabSize: '4',
      autosaveDelay: NaN,
      theme: 'pink',
      minimap: 'true',
    }),
  ).toEqual(defaultSettings);
  expect(parseSettings(null)).toEqual(defaultSettings);
});
