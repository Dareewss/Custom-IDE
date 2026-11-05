import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('isolates a static caller/callee neighborhood, changes depth and exits on an outside selection', async ({
  page,
}) => {
  const zip = new JSZip();
  for (const file of ['main.py', 'helper.py'])
    zip.file(file, await readFile(`tests/fixtures/python/connections/${file}`, 'utf8'));
  zip.file('unused.py', 'def unused():\n    return 9\n');
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Isolate.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Isolate');
  const panel = page.getByRole('region', { name: 'Code overview', exact: true });
  await expect(panel).toHaveAttribute('data-visible-nodes', '14');
  const search = page.getByRole('combobox', { name: 'Search 3D objects', exact: true });
  await page.getByLabel('Object kind filter', { exact: true }).selectOption('function');
  await search.fill('build');
  await search.press('Enter');
  await page.getByRole('button', { name: 'Isolate selected structure', exact: true }).click();
  await expect(panel).toHaveAttribute('data-isolated', 'true');
  await expect(panel).toHaveAttribute('data-visible-nodes', '7');
  await expect(page.locator('.isolation-bar')).toContainText('Isolated · function build');
  await page.getByLabel('Isolation depth', { exact: true }).selectOption('2');
  await expect(panel).toHaveAttribute('data-visible-nodes', '8');
  await expect(page.locator('.code-canvas canvas')).toHaveAttribute('data-dashed-edge-count', '1');
  await page.getByLabel('Isolation depth', { exact: true }).selectOption('0');
  await expect(panel).toHaveAttribute('data-visible-nodes', '2');
  await page.getByRole('button', { name: 'Exit isolate', exact: true }).click();
  await expect(panel).toHaveAttribute('data-visible-nodes', '14');
  await page.getByRole('button', { name: 'Isolate selected structure', exact: true }).click();
  await expect(panel).toHaveAttribute('data-isolated', 'true');
  await search.fill('unused');
  await search.press('Enter');
  await expect(panel).toHaveAttribute('data-isolated', 'false');
  await expect(panel).toHaveAttribute('data-visible-nodes', '14');
  await expect(page.locator('.breadcrumbs')).toContainText('unused.py');
});
