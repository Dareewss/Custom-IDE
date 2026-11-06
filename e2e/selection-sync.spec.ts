import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('synchronizes real Monaco selection, camera and hover while preserving breakpoint decorations', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Sync.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Sync');
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-labels-ready', '4');
  const initialTarget = await canvas.getAttribute('data-camera-target');
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  await editor.focus();
  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await expect(page.locator('.statusbar')).toContainText('Ln 4, Col 5');
  await expect(page.getByRole('tooltip').locator('strong')).toHaveText('add');
  await expect(canvas).not.toHaveAttribute('data-camera-target', initialTarget!);
  await expect(page.locator('.overview-source-selected')).not.toHaveCount(0);
  await page.keyboard.press('F9');
  await expect(page.locator('.breakpoint-glyph')).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  const focused = await canvas.getAttribute('data-camera-target');
  await page
    .locator('.view-line')
    .filter({ hasText: 'total = amount + 1' })
    .hover({ position: { x: 100, y: 10 } });
  await expect(page.getByRole('tooltip').locator('strong')).toHaveText('total');
  await expect(page.locator('.overview-source-hover')).not.toHaveCount(0);
  expect(await canvas.getAttribute('data-camera-target')).toBe(focused);
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'method add', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('treeitem', { name: 'variable total', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Ln 5, Col 9');
  try {
    await expect(editor).toBeFocused();
  } catch (error) {
    console.log(
      'Source focus diagnostic:',
      await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        className: document.activeElement?.className,
        label: document.activeElement?.getAttribute('aria-label'),
      })),
    );
    throw error;
  }
  await expect(page.locator('.overview-source-selected')).not.toHaveCount(0);
  await expect(page.locator('.breakpoint-glyph')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '4');
  await page.screenshot({ path: 'docs/screenshots/phase2/selection-sync.png' });
  const modes = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await modes.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toHaveCount(0);
  await modes.getByRole('button', { name: 'Split', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.locator('.breakpoint-glyph')).toHaveCount(1);
  expect(errors).toEqual([]);
});
