import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('renders nested loop rings and condition diamonds with source-linked branches', async ({
  page,
}) => {
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
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) => JSON.parse(el.getAttribute('data-geometry-counts') ?? '{}').TorusGeometry ?? 0,
      ),
    )
    .toBe(2);
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) => JSON.parse(el.getAttribute('data-geometry-counts') ?? '{}').OctahedronGeometry ?? 0,
      ),
    )
    .toBe(3);
  await expect
    .poll(() => canvas.evaluate((el) => Number(el.getAttribute('data-labels-ready') ?? 0)))
    .toBeGreaterThanOrEqual(10);
  await page.screenshot({ path: 'docs/screenshots/phase2/control-flow-shapes.png' });
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const outline = page.getByRole('tree', { name: 'Code outline', exact: true });
  await outline.getByRole('treeitem', { name: 'condition if item > 1', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Ln 2, Col 5');
  await expect(page.getByRole('tooltip')).toContainText('2 possible branches');
  await outline.getByRole('treeitem', { name: 'loop while', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Ln 6, Col 1');
  await expect(page.getByRole('tooltip')).toContainText('while');
});
