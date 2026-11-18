import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
test.use({ hasTouch: true });

test('draws a demand minimap and navigates the real camera by pointer, touch and keyboard', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Map.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Map');
  const map = page.getByRole('button', { name: '3D minimap', exact: true }),
    bitmap = map.locator('canvas');
  const canvas = page.locator('.code-canvas canvas');
  await expect
    .poll(async () => {
      const tiles = Number(await canvas.getAttribute('data-tile-instances'));
      return tiles > 0 && Number(await bitmap.getAttribute('data-node-count')) === tiles;
    })
    .toBe(true);
  await expect(bitmap).not.toHaveAttribute('data-frustum', '[]');
  const painted = await bitmap.evaluate(
    (el) =>
      Array.from(el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data).filter(
        (value, i) => i % 4 === 3 && value > 0,
      ).length,
  );
  expect(painted).toBeGreaterThan(20);
  const target = await canvas.getAttribute('data-camera-target'),
    frustum = await bitmap.getAttribute('data-frustum');
  await map.click({ position: { x: 20, y: 30 } });
  await expect(canvas).not.toHaveAttribute('data-camera-target', target!);
  await expect(bitmap).not.toHaveAttribute('data-frustum', frustum!);
  const box = (await map.boundingBox())!,
    beforeDrag = await canvas.getAttribute('data-camera-target');
  await page.mouse.move(box.x + 20, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 15, box.y + 65, { steps: 5 });
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute('data-camera-target', beforeDrag!);
  const beforeTouch = await canvas.getAttribute('data-camera-target');
  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + 25);
  await expect(canvas).not.toHaveAttribute('data-camera-target', beforeTouch!);
  await map.focus();
  const beforeKey = await canvas.getAttribute('data-camera-target');
  await page.keyboard.press('ArrowLeft');
  await expect(canvas).not.toHaveAttribute('data-camera-target', beforeKey!);
  await page.getByLabel('3D detail level', { exact: true }).selectOption('files');
  await expect(bitmap).toHaveAttribute('data-node-count', '1');
  await page.getByLabel('3D detail level', { exact: true }).selectOption('all');
  const search = page.getByRole('combobox', { name: 'Search 3D objects', exact: true });
  await page.getByLabel('Object kind filter', { exact: true }).selectOption('function');
  await search.fill('doubled');
  await search.press('Enter');
  await page.getByRole('button', { name: 'Isolate selected structure', exact: true }).click();
  await expect
    .poll(async () => Number(await bitmap.getAttribute('data-node-count')))
    .toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Exit isolate', exact: true }).click();
  await expect
    .poll(async () => {
      const tiles = Number(await canvas.getAttribute('data-tile-instances'));
      return tiles > 0 && Number(await bitmap.getAttribute('data-node-count')) === tiles;
    })
    .toBe(true);
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await expect
    .poll(async () => {
      const before = await canvas.getAttribute('data-scene-frames');
      await page.waitForTimeout(600);
      return before === (await canvas.getAttribute('data-scene-frames'));
    })
    .toBe(true);
  const frames = await canvas.getAttribute('data-scene-frames');
  await page.waitForTimeout(450);
  expect(await canvas.getAttribute('data-scene-frames')).toBe(frames);
  await page.screenshot({ path: 'docs/screenshots/phase2/minimap.png' });
});
