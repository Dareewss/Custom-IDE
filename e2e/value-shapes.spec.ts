import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('renders instanced values, bounded dictionary previews and picks the correct source sphere', async ({
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
  await expect(canvas).toHaveAttribute('data-labels-ready', '6');
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) => JSON.parse(el.getAttribute('data-geometry-counts') ?? '{}').SphereGeometry ?? 0,
      ),
    )
    .toBeGreaterThanOrEqual(5);
  const box = (await canvas.boundingBox())!;
  const tooltip = page.getByRole('tooltip');
  let picked = false;
  // A real raycast through the shared sphere batch, without a test-only scene API.
  for (let y = 25; y < box.height - 25; y += 3) {
    await page.mouse.move(box.x + box.width / 2, box.y + y);
    if ((await tooltip.locator('strong').allTextContents()).join('') === 'count') {
      await page.mouse.click(box.x + box.width / 2, box.y + y);
      picked = true;
      break;
    }
  }
  expect(picked).toBe(true);
  await expect(page.locator('.statusbar')).toContainText('Ln 1, Col 1');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const outline = page.getByRole('tree', { name: 'Code outline', exact: true });
  await outline.getByRole('treeitem', { name: 'collection items', exact: true }).click();
  await expect(tooltip).toContainText('10 declared items');
  await expect(tooltip.locator('li')).toHaveCount(8);
  await expect(tooltip).toContainText('2 more');
  await outline.getByRole('treeitem', { name: 'collection options', exact: true }).click();
  await expect(tooltip).toContainText('"enabled": True');
  await expect(page.locator('.statusbar')).toContainText('Ln 6, Col 1');
  await outline.getByRole('treeitem', { name: 'collection empty', exact: true }).click();
  await expect(tooltip).toContainText('0 declared items');
  await expect(tooltip.locator('li')).toHaveCount(0);
  await outline.getByRole('treeitem', { name: 'collection computed', exact: true }).click();
  await expect(tooltip).toContainText('Computed collection');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '6');
  await page.screenshot({ path: 'docs/screenshots/phase2/value-shapes.png' });
});
