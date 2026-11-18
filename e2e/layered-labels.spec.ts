import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });
test('clips real SDF labels inside tiles, scales at twelve pixels and reloads offline', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/'))
      external.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/);
  const assertLabels = async () => {
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-tile-labels')))
      .toBeGreaterThan(0);
    const bounds = JSON.parse((await canvas.getAttribute('data-tile-label-bounds'))!);
    expect(bounds.length).toBeLessThanOrEqual(300);
    for (const label of bounds) {
      expect(label.fontPixels).toBe(12);
      expect(label.text).toMatch(/ \d+L$/);
      expect(label.x).toBeGreaterThan(label.tile[0]);
      expect(label.y).toBeGreaterThan(label.tile[1]);
      expect(label.x + label.width).toBeLessThan(label.tile[0] + label.tile[2]);
      expect(label.y + label.height).toBeLessThan(label.tile[1] + label.tile[3]);
    }
  };
  await assertLabels();
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  await canvas.hover();
  await page.mouse.wheel(0, -150);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
    .toBeGreaterThan(zoom);
  await assertLabels();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/);
  await assertLabels();
  expect(external).toEqual([]);
});
test.describe('Flat font failure', () => {
  test.use({ serviceWorkers: 'block' });
  test('retains the real outline when the local font is invalid', async ({ page }) => {
    await page.route('**/fonts/JetBrainsMono-Regular.ttf', (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'This is invalid.' }),
    );
    await page.goto('/');
    await expect(page.getByRole('tree', { name: 'Code outline', exact: true })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'file main.py', exact: true })).toBeVisible();
  });
});

test.describe('Delayed local font', () => {
  test.use({ serviceWorkers: 'block' });
  test('keeps source geometry mounted while the local SDF font loads', async ({ page }) => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/fonts/JetBrainsMono-Regular.ttf', async (route) => {
      await ready;
      await route.continue();
    });
    try {
      await page.goto('/');
      const canvas = page.locator('.code-canvas canvas');
      await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
      const original = await canvas.elementHandle();
      expect(Number((await canvas.getAttribute('data-labels-ready')) ?? 0)).toBe(0);
      release();
      await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/, { timeout: 30000 });
      expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
    } finally {
      release();
    }
  });
});
