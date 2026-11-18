import { test, expect } from '@playwright/test';
import { importPlaneFixture as importFixture } from './fixtures/plane-page';

test.use({ storageState: { cookies: [], origins: [] } });

test('defaults to transparent orthographic flat tiles in one BVH-picked batch with no edges and no idle rendering', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const canvas = await importFixture(page);
  await expect(canvas).toHaveAttribute('data-scene-kind', 'flat');
  await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
  await expect(canvas).toHaveAttribute('data-tile-picking', 'bvh');
  await expect(canvas).toHaveAttribute('data-tile-edges', '0');
  const alpha = await canvas.evaluate((element) => {
    const gl = element.getContext('webgl2')!;
    return {
      alpha: gl.getContextAttributes()?.alpha,
      clear: Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)),
    };
  });
  expect(alpha).toEqual({ alpha: true, clear: [0, 0, 0, 0] });
  await expect(page.locator('.plane-row-label')).toHaveCount(5);
  await expect(page.locator('.plane-ruler-tick')).toHaveCount(7);
  const levels = await page
    .locator('.plane-row-label')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().y));
  for (let i = 1; i < levels.length; i++)
    expect(levels[i] - levels[i - 1]).toBeGreaterThanOrEqual(20);
  await expect(page.locator('.plane-track-header')).toContainText('main.py');
  await expect(page.getByText('Drag a function to move · Shift-drag for Z')).toHaveCount(0);
  await page.waitForTimeout(500);
  const frames = await canvas.getAttribute('data-scene-frames');
  await page.waitForTimeout(500);
  expect(await canvas.getAttribute('data-scene-frames')).toBe(frames);
  const hits = JSON.parse((await canvas.getAttribute('data-tile-hits'))!);
  const hit = hits.find(
    (hit: { level: number; nodeIds: string[] }) => hit.level === 2 && hit.nodeIds.length === 1,
  );
  expect(hit).toBeTruthy();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + hit.x, box.y + hit.y);
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-selected-node',
    hit.nodeIds[0],
  );
  await expect(page.locator('.breadcrumbs')).toContainText('main.py');
  expect(errors).toEqual([]);
});
test('migrates a legacy renderer preference to Flat and retains the actual outline', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('atlas-overview-renderer', 'classic'));
  const canvas = await importFixture(page);
  await expect(canvas).toHaveAttribute('data-scene-kind', 'flat');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(page.getByLabel('3D renderer', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'class Counter', exact: true })).toBeVisible();
});

test('shares the real Flat tiles with an owned popout and restores them on close', async ({
  page,
}) => {
  const canvas = await importFixture(page);
  const count = await canvas.getAttribute('data-tile-instances');
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
  const popup = await opened;
  await expect(popup.locator('.code-canvas canvas')).toHaveAttribute('data-tile-instances', count!);
  await expect(popup.locator('.code-canvas canvas')).toHaveAttribute('data-scene-kind', 'flat');
  await expect(popup.locator('.plane-row-label')).toHaveCount(5);
  await popup.close();
  await expect(canvas).toHaveAttribute('data-tile-instances', count!);
});
