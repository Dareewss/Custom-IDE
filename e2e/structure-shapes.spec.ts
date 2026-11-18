import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('renders classes and functions as one tile batch with source-linked selection', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Shapes.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Shapes');
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
  await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
  await expect(canvas).toHaveAttribute('data-visible-levels', '[0,1,2,4]');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const outline = page.getByRole('tree', { name: 'Code outline', exact: true });
  await outline.getByRole('treeitem', { name: 'method add', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Editor content' })).toBeFocused();
  await expect(page.locator('.statusbar')).toContainText('Ln 4, Col 5');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
  await page.screenshot({ path: 'docs/screenshots/phase2/structure-shapes.png' });
});
