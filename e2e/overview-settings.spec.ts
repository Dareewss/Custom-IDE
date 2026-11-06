import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('applies real 3D preferences and restores the project camera across modes and reload', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Preferences.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  const panel = page.getByRole('region', { name: 'Code overview', exact: true });
  const canvas = page.locator('.code-canvas canvas');
  await expect(panel).toHaveAttribute('data-visible-nodes', '9');
  await expect(canvas).toHaveAttribute('data-labels-ready', '4');
  await page.getByRole('group', { name: '3D navigation', exact: true }).focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowLeft');
  const position = await canvas.getAttribute('data-camera-position');
  const target = await canvas.getAttribute('data-camera-target');
  const layouts = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await layouts.getByRole('button', { name: 'Code', exact: true }).click();
  await layouts.getByRole('button', { name: 'Split', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-position', position!);
  await expect(canvas).toHaveAttribute('data-camera-target', target!);
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Workspace settings', exact: true });
  await settings.getByLabel('3D quality', { exact: true }).selectOption('low');
  await settings.getByLabel('3D labels', { exact: true }).uncheck();
  await settings.getByLabel('3D connections', { exact: true }).uncheck();
  await settings.getByLabel('3D symbol size', { exact: true }).focus();
  await page.keyboard.press('End');
  await settings.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '0');
  await expect(canvas).toHaveAttribute('data-edge-count', '0');
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => element.width / element.clientWidth),
  ).toBeCloseTo(1, 1);
  await page.reload();
  await expect(canvas).toHaveAttribute('data-camera-position', position!);
  await expect(canvas).toHaveAttribute('data-camera-target', target!);
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(settings.getByLabel('3D quality', { exact: true })).toHaveValue('low');
  await expect(settings.getByLabel('3D labels', { exact: true })).not.toBeChecked();
  await expect(settings.getByLabel('3D connections', { exact: true })).not.toBeChecked();
  await expect(settings.getByLabel('3D symbol size', { exact: true })).toHaveValue('125');
  await settings.getByLabel('3D labels', { exact: true }).check();
  await settings.getByLabel('3D connections', { exact: true }).check();
  await settings.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '4');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const file = page.getByRole('treeitem', { name: 'file main.py', exact: true });
  await file.focus();
  await page.keyboard.press('c');
  await expect(page.getByRole('treeitem', { name: 'class Counter', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'variable initial', exact: true })).toBeFocused();
  expect(
    await page.locator(':focus').evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe('solid');
});

test('keeps a large WebGL fallback keyboard-accessible with bounded DOM rows', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
        return Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/');
  const zip = new JSZip();
  zip.file(
    'main.py',
    Array.from({ length: 600 }, (_, index) => `value_${index} = ${index}`).join('\n') + '\n',
  );
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Outline.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  const tree = page.getByRole('tree', { name: 'Code outline', exact: true });
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-model-nodes',
    '601',
  );
  await tree.getByRole('treeitem', { name: 'file main.py', exact: true }).focus();
  await page.keyboard.press('End');
  const last = tree.getByRole('treeitem', { name: 'variable value_599', exact: true });
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute('aria-posinset', '600');
  await expect(last).toHaveAttribute('aria-setsize', '600');
  expect(await tree.getByRole('treeitem').count()).toBeLessThan(80);
  await page.keyboard.press('Home');
  await expect(tree.getByRole('treeitem', { name: 'file main.py', exact: true })).toBeFocused();
  await page.keyboard.press('v');
  await expect(tree.getByRole('treeitem', { name: 'variable value_0', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Ln 600, Col 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Editor content', exact: true })).toBeFocused();
});
