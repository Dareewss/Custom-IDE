import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });
test('zooms at cursor, pans, fits, maps and preserves editor shortcuts', async ({ page }) => {
  const canvas = await importPlaneFixture(page, { 'helper.py': 'def helper():\n    return 1\n' });
  const nav = page.getByRole('group', { name: '3D navigation', exact: true });
  await nav.focus();
  await page.keyboard.press('f');
  const before = Number(await canvas.getAttribute('data-camera-zoom')),
    box = (await canvas.boundingBox())!;
  const target = await canvas.getAttribute('data-camera-target');
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await page.mouse.wheel(0, -200);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
    .toBeGreaterThan(before);
  await expect(canvas).not.toHaveAttribute('data-camera-target', target!);
  const panned = await canvas.getAttribute('data-camera-target');
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35, { steps: 6 });
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute('data-camera-target', panned!);
  await page.getByRole('button', { name: 'Fit all objects (F)', exact: true }).click();
  const map = page.getByRole('button', { name: '3D minimap', exact: true });
  await expect(map.locator('canvas')).toHaveAttribute('data-lanes', '2');
  const pose = await canvas.getAttribute('data-camera-position');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await expect(canvas).not.toHaveAttribute('data-camera-position', pose!);
  await page.getByRole('combobox', { name: 'Search 3D objects' }).fill('summarize');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-dimmed-tiles')))
    .toBeGreaterThan(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('Ln 12');
  await nav.focus();
  await page.keyboard.press('Shift+f');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
    .toBeGreaterThan(before);
  await page.keyboard.press('c');
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await page.keyboard.press('i');
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-isolated',
    'true',
  );
  await page.getByRole('button', { name: 'Exit isolate', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-isolated',
    'false',
  );
  const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
  await editor.focus();
  await page.keyboard.press('Control+Space');
  await expect(page.getByRole('dialog')).toBeVisible();
});
