import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });
test('inspects actual stats, filters levels and restores project modes, camera and controls', async ({
  page,
}) => {
  const canvas = await importPlaneFixture(page);
  const inspector = page.getByRole('complementary', { name: 'Structure inspector', exact: true });
  await expect(inspector.getByLabel('Scope statistics')).toContainText('Files1');
  const before = Number(await canvas.getAttribute('data-tile-instances'));
  await inspector.getByLabel('Show Values', { exact: true }).uncheck();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tile-instances')))
    .toBeLessThan(before);
  await expect(canvas).toHaveAttribute('data-visible-levels', '[0,1,2,3]');
  await inspector.getByLabel('Extrude by complexity', { exact: true }).check();
  await expect(canvas).toHaveAttribute('data-tile-extrusion', 'true');
  await inspector.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
  await expect(canvas).toHaveAttribute('data-layer-progress', '1');
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await inspector.getByLabel('Plane gap', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await inspector.getByLabel('Tile connections', { exact: true }).selectOption('context');
  await page.getByRole('group', { name: '3D navigation', exact: true }).focus();
  const beforePan = JSON.parse((await canvas.getAttribute('data-camera-target'))!);
  await page.keyboard.press('Shift+ArrowRight');
  await expect
    .poll(async () => {
      const x = JSON.parse((await canvas.getAttribute('data-camera-target')) ?? '[]')[0];
      return Number.isFinite(x) && Math.abs(x - beforePan[0]) > 0.1;
    })
    .toBe(true);
  const target = await canvas.getAttribute('data-camera-target');
  await expect
    .poll(() =>
      page.evaluate((wanted: number[]) => {
        return Object.entries(localStorage).some(([key, value]) => {
          if (!key.startsWith('atlas-overview-planes-')) return false;
          const prefs = JSON.parse(value);
          const saved =
            prefs.mode === 'layers' && prefs.gap === 5.5 ? prefs.cameras?.layers?.target : null;
          return (
            Array.isArray(saved) &&
            saved.length === 3 &&
            saved.every((v: number, i: number) => Math.abs(v - wanted[i]) < 0.01)
          );
        });
      }, JSON.parse(target!)),
    )
    .toBe(true);
  await page.reload();
  await expect(canvas).toHaveAttribute('data-layer-progress', '1');
  await expect(inspector.getByLabel('Show Values', { exact: true })).not.toBeChecked();
  await expect(inspector.getByLabel('Extrude by complexity', { exact: true })).toBeChecked();
  await expect(inspector.getByLabel('Tile connections', { exact: true })).toHaveValue('context');
  await expect(inspector.getByLabel('Plane gap', { exact: true })).toHaveValue('5.5');
  await expect
    .poll(async () => {
      const actual = JSON.parse((await canvas.getAttribute('data-camera-target')) ?? '[]');
      const wanted = JSON.parse(target!);
      return (
        actual.length === 3 &&
        actual.every((v: number, i: number) => Math.abs(v - wanted[i]) < 0.01)
      );
    })
    .toBe(true);
});
