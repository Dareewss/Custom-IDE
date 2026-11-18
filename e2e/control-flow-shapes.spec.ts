import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('renders aligned control-flow tiles with source-linked branches', async ({ page }) => {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/control_flow.py', 'utf8'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Branches.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Branches');
  await page
    .getByRole('group', { name: 'Workspace layout', exact: true })
    .getByRole('button', { name: '3D', exact: true })
    .click();
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
  await expect(canvas).toHaveAttribute('data-visible-levels', /3/);
  await expect(canvas).toHaveAttribute('data-tile-labels', /[1-9]/);
  await page.screenshot({ path: 'docs/screenshots/phase2/control-flow-shapes.png' });
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const outline = page.getByRole('tree', { name: 'Code outline', exact: true });
  await page.mouse.move(0, 0);
  await outline.getByRole('treeitem', { name: 'condition if item > 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('Ln 2, Col 5');
  await expect(page.getByRole('tooltip')).toContainText('2 possible branches');
  await page.mouse.move(0, 0);
  await outline.getByRole('treeitem', { name: 'loop while', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('Ln 6, Col 1');
  await expect(page.getByRole('tooltip')).toContainText('while');
});
