export function materialAlphas(transparency: number, theme: 'dark' | 'light') {
  const amount = Number.isFinite(transparency) ? Math.min(100, Math.max(0, transparency)) : 0;
  const strength = (100 - amount) / 100;
  return {
    backing: 0.96 * strength,
    panel: 0.75 * strength,
    editor: 0.75 * strength,
    elevated: theme === 'dark' ? 0.94 : 0.97,
  };
}
