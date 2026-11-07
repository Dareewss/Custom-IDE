import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

async function openFixture(page: Page) {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Popout.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Popout');
  await expect(page.locator('.code-canvas canvas')).toHaveAttribute('data-labels-ready', '4');
}

async function popOut(page: Page) {
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
  const popup = await opened;
  await expect(popup.getByRole('region', { name: 'Code overview', exact: true })).toBeVisible();
  return popup;
}

test('shares live code, selection, appearance and outline across pop-out and docking', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openFixture(page);
  const popup = await popOut(page);
  popup.on('pageerror', (error) => errors.push(error.message));
  const canvas = popup.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-labels-ready', '4');
  expect(
    await canvas.evaluate(
      (element) =>
        (element as HTMLCanvasElement).getContext('webgl2')?.getContextAttributes()?.alpha,
    ),
  ).toBe(true);
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveCount(0);
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(popup).toHaveTitle('Popout — 3D overview — Code Atlas');
  await popup.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await popup.getByRole('treeitem', { name: 'method add', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Ln 4, Col 5');
  await expect(popup.getByRole('treeitem', { name: 'method add', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  await editor.focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('End');
  await page.keyboard.type('\n\ndef detached_update():\n    return 42\n');
  await expect(
    popup.getByRole('treeitem', { name: 'function detached_update', exact: true }),
  ).toBeVisible();
  // Portal chrome follows the application's theme rather than booting a second workspace.
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await page.getByRole('combobox', { name: 'Color theme', exact: true }).selectOption('light');
  await expect(popup.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Escape');
  await popup.getByRole('button', { name: 'Dock 3D view', exact: true }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(
    page.getByRole('treeitem', { name: 'function detached_update', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Show code outline', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Pop out 3D view', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

test('returns a closed window to the editor and closes its owned viewer on reload', async ({
  page,
  context,
}) => {
  await openFixture(page);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const popup = await popOut(page);
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.getByRole('button', { name: 'Focus 3D window', exact: true }).click();
  expect(context.pages()).toHaveLength(2);
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await popup.close();
  await expect(page.getByRole('button', { name: 'Pop out 3D view', exact: true })).toBeVisible();
  const reopened = await popOut(page);
  await page.reload();
  await expect.poll(() => reopened.isClosed()).toBe(true);
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toBeVisible();
});

test('keeps the view usable and explains a blocked pop-up', async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => {
    window.open = () => null;
  });
  await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
  await expect(page.locator('.error-toast')).toContainText('Allow pop-ups for Code Atlas');
  await expect(page.locator('.code-canvas canvas')).toHaveAttribute('data-labels-ready', '4');
});

test('keeps the camera through both moves and accepts navigation in the separate window', async ({
  page,
}) => {
  await openFixture(page);
  const mainCanvas = page.locator('.code-canvas canvas');
  await expect(mainCanvas).toHaveAttribute('data-camera-target', /\[/);
  const initial = await mainCanvas.getAttribute('data-camera-target');
  await page.getByRole('group', { name: '3D navigation', exact: true }).focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(mainCanvas).not.toHaveAttribute('data-camera-target', initial!);
  const target = await mainCanvas.getAttribute('data-camera-target');
  const popup = await popOut(page);
  const canvas = popup.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-camera-target', target!);
  await expect(canvas).toHaveAttribute('data-camera-position', /\[/);
  const position = await canvas.getAttribute('data-camera-position');
  await popup.getByRole('group', { name: '3D navigation', exact: true }).focus();
  await popup.keyboard.press('ArrowLeft');
  await expect(canvas).not.toHaveAttribute('data-camera-position', position!);
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  const rotated = await canvas.getAttribute('data-camera-position');
  await popup.getByRole('button', { name: 'Dock 3D view', exact: true }).click();
  await expect(mainCanvas).toHaveAttribute('data-camera-position', rotated!);
  await expect(mainCanvas).toHaveAttribute('data-camera-target', target!);
});
