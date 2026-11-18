import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test('caps real unresolved connections and reports hidden edges with accessible source navigation', async ({
  page,
}) => {
  const source =
    'def workload():\n' +
    Array.from({ length: 215 }, (_, i) => `    missing_${i}()`).join('\n') +
    '\n';
  const canvas = await importPlaneFixture(page, { 'busy.py': source });
  await page.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
  await expect(canvas).toHaveAttribute('data-tile-edges', '0');
  await page.getByLabel('Tile connections', { exact: true }).selectOption('all');
  await expect(canvas).toHaveAttribute('data-tile-edges', '200');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-hidden-edges')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-dashed-edge-count')))
    .toBeGreaterThan(190);
  await expect(page.getByLabel('Hidden connections', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Search 3D objects', exact: true }).fill('workload');
  await page.keyboard.press('Enter');
  await expect(page.locator('.breadcrumbs')).toContainText('busy.py');
  await expect(page.locator('.statusbar')).toContainText('Ln 1, Col 1');
  await expect(
    page.getByRole('complementary', { name: 'Structure inspector', exact: true }),
  ).toContainText('callees (215)');
  await page.getByLabel('Tile connections', { exact: true }).selectOption('none');
  await expect(canvas).toHaveAttribute('data-tile-edges', '0');
});
