import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

test.use({ storageState: { cookies: [], origins: [] } });

async function importFixture(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/bug_small_25.py', 'utf8'));
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Flat.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
  return canvas;
}
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
test('retains Classic only through the renderer setting and keeps the actual outline available', async ({
  page,
}) => {
  await importFixture(page);
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await page.getByRole('combobox', { name: '3D renderer', exact: true }).selectOption('classic');
  await page.keyboard.press('Escape');
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/, { timeout: 30000 });
  await expect(page.locator('.plane-track-header')).toHaveCount(0);
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
