import { expect, it } from 'vitest';
import { defaultSettings, parseSettings } from './model';
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
