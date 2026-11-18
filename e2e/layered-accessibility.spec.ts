import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });
test('keeps Flat outline synced, visible focus in high contrast and camera across immediate unmount', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const canvas = await importPlaneFixture(page);
  const nav = page.getByRole('group', { name: '3D navigation', exact: true });
  await nav.focus();
  const initial = await canvas.getAttribute('data-camera-position');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(canvas).not.toHaveAttribute('data-camera-position', initial!);
  const position = await canvas.getAttribute('data-camera-position');
  const modes = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await modes.getByRole('button', { name: 'Code', exact: true }).click();
  await modes.getByRole('button', { name: 'Split', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-position', position!);
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const tree = page.getByRole('tree', { name: 'Code outline', exact: true }),
    file = tree.getByRole('treeitem', { name: 'file main.py', exact: true });
  await file.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(tree.getByRole('treeitem').last()).toHaveAttribute('aria-selected', 'true');
  await file.focus();
  expect(await file.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await page.getByLabel('3D quality', { exact: true }).selectOption('low');
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-tile-label-budget', '100');
});
