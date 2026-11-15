import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });
test('keeps connections opt-in, draws unresolved references dashed and aggregates imports', async ({
  page,
}) => {
  const canvas = await importPlaneFixture(page, {
    'calls.py':
      'from helper import known\nfrom helper import other\ndef use():\n    known()\n    missing()\n',
    'helper.py': 'def known():\n    return 1\ndef other():\n    return 2\n',
  });
  await expect(canvas).toHaveAttribute('data-tile-edges', '0');
  await page.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await page.getByLabel('Tile connections', { exact: true }).selectOption('all');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tile-edges')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-dashed-edge-count')))
    .toBeGreaterThan(0);
  await page.getByLabel('Import bands', { exact: true }).check();
  await expect
    .poll(async () =>
      JSON.parse((await canvas.getAttribute('data-import-bands')) ?? '[]').some(
        (b: { count: number }) => b.count === 2,
      ),
    )
    .toBe(true);
  await page.getByLabel('Tile connections', { exact: true }).selectOption('none');
  await page.getByLabel('Import bands', { exact: true }).uncheck();
  await expect(canvas).toHaveAttribute('data-tile-edges', '0');
});
