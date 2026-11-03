export interface Settings {
  backgroundTransparency: number;
  backgroundPreset: 'neon' | 'ocean' | 'nebula';
  blurStrength: number;
  backgroundBlobs: boolean;
  backgroundAnimation: boolean;
  performanceMode: boolean;
  desktopBlur: boolean;
  animationSpeed: number;
  fontSize: number;
  tabSize: number;
  theme: 'dark' | 'light';
  autosaveDelay: number;
  wordWrap: boolean;
  minimap: boolean;
  formatOnSave: boolean;
}
export const defaultSettings: Settings = {
  backgroundTransparency: 0,
  backgroundPreset: 'neon',
  blurStrength: 24,
  backgroundBlobs: true,
  backgroundAnimation: true,
  performanceMode: false,
  desktopBlur: true,
  animationSpeed: 1,
  fontSize: 14,
  tabSize: 4,
  theme: 'dark',
  autosaveDelay: 500,
  wordWrap: false,
  minimap: false,
  formatOnSave: false,
};
export function parseSettings(input: unknown): Settings {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const number = (
    key: 'fontSize' | 'tabSize' | 'autosaveDelay' | 'backgroundTransparency' | 'blurStrength',
    min: number,
    max: number,
  ) =>
    typeof value[key] === 'number' &&
    Number.isFinite(value[key]) &&
    Number.isInteger(value[key]) &&
    value[key] >= min &&
    value[key] <= max
      ? value[key]
      : defaultSettings[key];
  return {
    backgroundTransparency: number('backgroundTransparency', 0, 100),
    backgroundPreset:
      value.backgroundPreset === 'ocean' || value.backgroundPreset === 'nebula'
        ? value.backgroundPreset
        : 'neon',
    blurStrength: number('blurStrength', 24, 48),
    backgroundBlobs: typeof value.backgroundBlobs === 'boolean' ? value.backgroundBlobs : true,
    backgroundAnimation:
      typeof value.backgroundAnimation === 'boolean' ? value.backgroundAnimation : true,
    performanceMode: value.performanceMode === true,
    desktopBlur: typeof value.desktopBlur === 'boolean' ? value.desktopBlur : true,
    animationSpeed:
      typeof value.animationSpeed === 'number' &&
      Number.isFinite(value.animationSpeed) &&
      value.animationSpeed >= 0.25 &&
      value.animationSpeed <= 2 &&
      Number.isInteger(value.animationSpeed * 4)
        ? value.animationSpeed
        : 1,
    fontSize: number('fontSize', 10, 32),
    tabSize: number('tabSize', 1, 8),
    autosaveDelay: number('autosaveDelay', 100, 10000),
    theme: value.theme === 'light' ? 'light' : 'dark',
    wordWrap: value.wordWrap === true,
    minimap: value.minimap === true,
    formatOnSave: value.formatOnSave === true,
  };
}
