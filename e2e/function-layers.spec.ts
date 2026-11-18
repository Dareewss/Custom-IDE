import { test, expect } from '@playwright/test';
import { importPlaneFixture, dockPlaneWindow } from './fixtures/plane-page';
test('keeps nested functions on semantic rows and shares Layers spacing with the popout', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const canvas = await importPlaneFixture(page, {
    'nested.py': 'def outer():\n    def inner():\n        return 1\n    return inner()\n',
  });
  await page.getByRole('treeitem', { name: 'nested.py', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-tile-hits', /nested.py/);
  const flat = JSON.parse((await canvas.getAttribute('data-tile-hits'))!).filter(
    (hit: { level: number }) => hit.level === 2,
  );
  expect(flat).toHaveLength(2);
  expect(flat[0].position[1]).not.toBe(flat[1].position[1]);
  await page.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
  await expect(canvas).toHaveAttribute('data-layer-progress', '1');
  const hits = JSON.parse((await canvas.getAttribute('data-tile-hits'))!).filter(
    (hit: { level: number; lane: number }) => hit.level === 2 && hit.lane === 1,
  );
  expect(hits).toHaveLength(2);
  expect(hits[0].position[1]).toBe(hits[1].position[1]);
  expect(hits[0].position[2]).not.toBe(hits[1].position[2]);
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
  const popup = await opened;
  await expect(popup.getByLabel('Structure view mode', { exact: true })).toHaveValue('layers');
  await popup.getByLabel('Plane gap', { exact: true }).fill('7');
  await dockPlaneWindow(popup);
  await expect(canvas).toHaveAttribute('data-scene-kind', 'layers');
  await expect(page.getByLabel('Plane gap', { exact: true })).toHaveValue('7');
  await page.reload();
  await expect(page.getByLabel('Structure view mode', { exact: true })).toHaveValue('layers');
  await expect(page.getByLabel('Plane gap', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Function Z offset', { exact: true })).toHaveCount(0);
});
