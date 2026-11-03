export function materialAlphas(transparency: number, theme: 'dark' | 'light') {
  const amount = Number.isFinite(transparency) ? Math.min(100, Math.max(0, transparency)) : 0;
  const strength = (100 - amount) / 100;
  return {
    backing: theme === 'dark' ? 0.02 + 0.82 * strength : 0.03 + 0.45 * strength,
    panel: theme === 'dark' ? 0.86 + 0.06 * strength : 0.88 + 0.06 * strength,
    editor: theme === 'dark' ? 0.88 + 0.08 * strength : 0.92 + 0.05 * strength,
    elevated: theme === 'dark' ? 0.9 + 0.07 * strength : 0.94 + 0.04 * strength,
  };
}
