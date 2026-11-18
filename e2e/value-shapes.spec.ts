import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('renders instanced value tiles, bounded dictionary previews and picks exact source', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/values.py', 'utf8'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Values.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Values');
  await page
    .getByRole('group', { name: 'Workspace layout', exact: true })
    .getByRole('button', { name: '3D', exact: true })
    .click();
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
  await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
  await expect
    .poll(async () => {
      const b = await canvas.boundingBox();
      const size = JSON.parse((await canvas.getAttribute('data-render-size')) ?? '[]');
      return !!b && b.width > 200 && Math.abs(b.width - size[0]) + Math.abs(b.height - size[1]) < 1;
    })
    .toBe(true);
  const box = (await canvas.boundingBox())!;
  const tooltip = page.getByRole('tooltip');
  const hit = JSON.parse((await canvas.getAttribute('data-tile-hits'))!).find(
    (item: { level: number; nodeIds: string[] }) => item.level === 4 && item.nodeIds.length === 1,
  );
  expect(hit).toBeTruthy();
  await page.mouse.move(box.x + hit.x, box.y + hit.y);
  await expect(tooltip.locator('strong')).toHaveText('count');
  await page.mouse.click(box.x + hit.x, box.y + hit.y);
  await expect(page.locator('.statusbar')).toContainText('Ln 1, Col 1');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const outline = page.getByRole('tree', { name: 'Code outline', exact: true });
  await page.mouse.move(0, 0);
  await outline.getByRole('treeitem', { name: 'collection items', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(tooltip).toContainText('10 declared items');
  await expect(tooltip.locator('li')).toHaveCount(8);
  await expect(tooltip).toContainText('2 more');
  await page.mouse.move(0, 0);
  await outline.getByRole('treeitem', { name: 'collection options', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(tooltip).toContainText('"enabled": True');
  await expect(page.locator('.statusbar')).toContainText('Ln 6, Col 1');
  await page.mouse.move(0, 0);
  await outline.getByRole('treeitem', { name: 'collection empty', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(tooltip).toContainText('0 declared items');
  await expect(tooltip.locator('li')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await outline.getByRole('treeitem', { name: 'collection computed', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(tooltip).toContainText('Computed collection');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
  await page.screenshot({ path: 'docs/screenshots/phase2/value-shapes.png' });
});
