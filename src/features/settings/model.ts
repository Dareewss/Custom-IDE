export interface Settings {
  backgroundTransparency: number;
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
    key: 'fontSize' | 'tabSize' | 'autosaveDelay' | 'backgroundTransparency',
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
    fontSize: number('fontSize', 10, 32),
    tabSize: number('tabSize', 1, 8),
    autosaveDelay: number('autosaveDelay', 100, 10000),
    theme: value.theme === 'light' ? 'light' : 'dark',
    wordWrap: value.wordWrap === true,
    minimap: value.minimap === true,
    formatOnSave: value.formatOnSave === true,
  };
}
