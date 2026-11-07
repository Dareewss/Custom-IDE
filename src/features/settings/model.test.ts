import { expect, it } from 'vitest';
import { defaultSettings, parseSettings, migrateSettings } from './model';
it('validates overview quality, switches and bounded symbol size without resetting older settings', () => {
  expect(
    parseSettings({
      overviewQuality: 'low',
      overviewLabels: false,
      overviewEdges: false,
      overviewNodeSize: 125,
      fontSize: 18,
    }),
  ).toMatchObject({
    overviewQuality: 'low',
    overviewLabels: false,
    overviewEdges: false,
    overviewNodeSize: 125,
    fontSize: 18,
  });
  expect(
    parseSettings({ overviewQuality: 'ultra', overviewLabels: 'false', overviewNodeSize: NaN }),
  ).toEqual(defaultSettings);
  expect(parseSettings({ overviewNodeSize: 74 }).overviewNodeSize).toBe(100);
  expect(parseSettings({ overviewNodeSize: 126 }).overviewNodeSize).toBe(100);
});
it('preserves transparency endpoints and rejects invalid persisted values', () => {
  expect(parseSettings({ backgroundTransparency: 0 }).backgroundTransparency).toBe(0);
  expect(parseSettings({ backgroundTransparency: 100 }).backgroundTransparency).toBe(100);
  expect(parseSettings({ backgroundTransparency: 53 }).backgroundTransparency).toBe(53);
  for (const value of [-1, 101, NaN, '50', null, 0.5])
    expect(parseSettings({ backgroundTransparency: value }).backgroundTransparency).toBe(100);
});
it('round-trips valid settings', () => {
  const settings = {
    ...defaultSettings,
    fontSize: 18,
    theme: 'light',
    wordWrap: true,
  };
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
it('discards retired glass preferences while preserving existing settings', () => {
  expect(parseSettings({ glassEffect: true, backgroundTransparency: 75, fontSize: 18 })).toEqual({
    ...defaultSettings,
    backgroundTransparency: 75,
    fontSize: 18,
  });
});
it('migrates old preferences and validates preset, blur and background switches', () => {
  expect(parseSettings({ backgroundTransparency: 75, fontSize: 18 })).toMatchObject({
    backgroundTransparency: 75,
    fontSize: 18,
    backgroundPreset: 'neon',
    blurStrength: 4,
    backgroundBlobs: true,
    backgroundAnimation: true,
  });
  for (const preset of ['neon', 'ocean', 'nebula'])
    expect(parseSettings({ backgroundPreset: preset }).backgroundPreset).toBe(preset);
  expect(parseSettings({ backgroundPreset: 'unknown' }).backgroundPreset).toBe('neon');
  for (const blurStrength of [-1, 49, 1.2, NaN, '24'])
    expect(parseSettings({ blurStrength }).blurStrength).toBe(4);
  expect(
    parseSettings({ blurStrength: 0, backgroundBlobs: false, backgroundAnimation: false }),
  ).toMatchObject({ blurStrength: 0, backgroundBlobs: false, backgroundAnimation: false });
  expect(parseSettings({ blurStrength: 48 }).blurStrength).toBe(48);
  expect(parseSettings({ backgroundBlobs: 'false', backgroundAnimation: 0 })).toMatchObject({
    backgroundBlobs: true,
    backgroundAnimation: true,
  });
});
it('enables performance mode only for an explicit persisted boolean', () => {
  expect(parseSettings({ performanceMode: true }).performanceMode).toBe(true);
  for (const performanceMode of [false, undefined, null, 'true', 1])
    expect(parseSettings({ performanceMode }).performanceMode).toBe(false);
});
it('enables native desktop blur by default and preserves an explicit opt-out', () => {
  expect(parseSettings({}).desktopBlur).toBe(true);
  expect(parseSettings({ desktopBlur: false }).desktopBlur).toBe(false);
  expect(parseSettings({ desktopBlur: 'false' }).desktopBlur).toBe(true);
});
it('validates quarter-step animation speeds and migrates missing values', () => {
  for (const animationSpeed of [0.25, 0.5, 1, 1.75, 2])
    expect(parseSettings({ animationSpeed }).animationSpeed).toBe(animationSpeed);
  for (const animationSpeed of [undefined, null, '2', NaN, 0, 2.25, 0.3])
    expect(parseSettings({ animationSpeed }).animationSpeed).toBe(1);
});

it('migrates heavy frost to clear once without changing editor or motion preferences', () => {
  const old = {
    fontSize: 18,
    backgroundTransparency: 25,
    blurStrength: 36,
    desktopBlur: true,
    backgroundBlobs: true,
    backgroundAnimation: true,
    animationSpeed: 1.25,
  };
  expect(migrateSettings(old, 9)).toMatchObject({
    ...old,
    backgroundTransparency: 100,
    blurStrength: 4,
    desktopBlur: true,
  });
  expect(migrateSettings(old, 10)).toEqual(parseSettings(old));
  expect(parseSettings({ blurStrength: 0 }).blurStrength).toBe(0);
  expect(parseSettings({ blurStrength: 6 }).blurStrength).toBe(6);
});

it('enables the native blur upgrade once without resetting tint or editor preferences', () => {
  const old = {
    ...defaultSettings,
    desktopBlur: false,
    backgroundTransparency: 73,
    blurStrength: 6,
    fontSize: 18,
    animationSpeed: 1.25,
  };
  expect(migrateSettings(old, 10)).toEqual({ ...old, desktopBlur: true });
  expect(migrateSettings(old, 11)).toEqual(old);
});
