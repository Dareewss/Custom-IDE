import { _electron, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const profile = await mkdtemp(join(tmpdir(), 'atlas-optics-test-'));
if (!profile.startsWith(join(tmpdir(), 'atlas-optics-test-')))
  throw new Error('Unexpected optics profile');
const probe = createServer();
await new Promise((done) => probe.listen(0, '127.0.0.1', done));
const port = probe.address().port;
await new Promise((done) => probe.close(done));
const env = {
  ...process.env,
  CODE_ATLAS_USER_DATA: profile,
  CODE_ATLAS_PORT: String(port),
  CODE_ATLAS_TEST_MODE: '1',
};
delete env.ELECTRON_RUN_AS_NODE;
const app = await _electron.launch({
  ...(process.env.CODE_ATLAS_TEST_EXE
    ? { executablePath: process.env.CODE_ATLAS_TEST_EXE, args: [] }
    : { args: [resolve('desktop-out/main.cjs')] }),
  env,
});
try {
  const page = await app.firstWindow();
  await page.locator('.workspace').waitFor();
  // The only background is this test-owned window. No desktop images are saved.
  await app.evaluate(async ({ BrowserWindow, screen }) => {
    const main = BrowserWindow.getAllWindows()[0];
    const bounds = screen.getPrimaryDisplay().bounds;
    const fixture = new BrowserWindow({
      ...bounds,
      frame: false,
      show: false,
      backgroundColor: '#20dc50',
      webPreferences: { nodeIntegration: false, sandbox: true, backgroundThrottling: false },
    });
    fixture.setTitle('Optics test fixture');
    await fixture.loadURL(
      'data:text/html,<style>html,body{margin:0;width:100%;height:100%;background:rgb(32,220,80)}</style>',
    );
    fixture.setAlwaysOnTop(true);
    fixture.showInactive();
    fixture.moveTop();
    main.setBounds({
      x: bounds.x + 60,
      y: bounds.y + 40,
      width: Math.min(1440, bounds.width - 100),
      height: Math.min(900, bounds.height - 80),
    });
    main.setAlwaysOnTop(true);
    main.showInactive();
    main.moveTop();
  });
  const setTransparency = async (value) => {
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    const slider = page.getByRole('slider', { name: 'Background transparency', exact: true });
    await slider.press('End');
    for (let i = value; i < 100; i++) await slider.press('ArrowLeft');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
  };
  const pixel = async (x = 405, y = 260) =>
    app.evaluate(
      async ({ BrowserWindow }, { x, y }) => {
        const main = BrowserWindow.getAllWindows().find(
          (w) => w.getTitle() !== 'Optics test fixture',
        );
        const image = await main.capturePage({ x, y, width: 1, height: 1 }, { stayHidden: true });
        const b = image.toBitmap();
        return { r: b[2], g: b[1], b: b[0], a: b[3] };
      },
      { x, y },
    );
  const backdrop = async (color) =>
    app.evaluate(async ({ BrowserWindow }, color) => {
      const fixture = BrowserWindow.getAllWindows().find(
        (w) => w.getTitle() === 'Optics test fixture',
      );
      await fixture.webContents.executeJavaScript(
        `document.body.style.background=${JSON.stringify(color)}; document.documentElement.style.background=${JSON.stringify(color)}`,
      );
    }, color);
  await setTransparency(75);
  await expect(page.locator('html')).toHaveAttribute('data-optical-glass', 'ready', {
    timeout: 20000,
  });
  await expect.poll(async () => (await pixel()).g).toBeGreaterThan(140);
  await backdrop('rgb(32,60,230)');
  await expect.poll(async () => (await pixel()).b).toBeGreaterThan(150);
  await expect.poll(async () => (await pixel()).g).toBeLessThan(90);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.getTitle() !== 'Optics test fixture')
      .minimize(),
  );
  await expect(page.locator('html')).toHaveAttribute('data-optical-glass', 'paused');
  await expect
    .poll(async () =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.getTitle() !== 'Optics test fixture')
          .isContentProtected(),
      ),
    )
    .toBe(false);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.getTitle() !== 'Optics test fixture')
      .restore(),
  );
  await expect(page.locator('html')).toHaveAttribute('data-optical-glass', 'ready', {
    timeout: 20000,
  });

  // Restore the test-owned backing window's stacking order after minimizing the app window.
  await app.evaluate(({ BrowserWindow }) => {
    const fixture = BrowserWindow.getAllWindows().find(
      (w) => w.getTitle() === 'Optics test fixture',
    );
    const main = BrowserWindow.getAllWindows().find((w) => w.getTitle() !== 'Optics test fixture');
    fixture.setAlwaysOnTop(true);
    fixture.showInactive();
    fixture.moveTop();
    main.moveTop();
  });
  // A stripe viewed through a convex edge must shift hue, unlike an unwarped tint.
  await backdrop(
    'repeating-linear-gradient(90deg, rgb(240,20,70) 0 10px, rgb(20,90,240) 10px 20px)',
  );
  await page.waitForTimeout(350);
  const pane = await page.locator('.editor-card').boundingBox();
  const result = await app.evaluate(async ({ BrowserWindow, desktopCapturer, screen }, pane) => {
    const main = BrowserWindow.getAllWindows().find((w) => w.getTitle() !== 'Optics test fixture');
    const bounds = main.getBounds(),
      display = screen.getDisplayMatching(bounds);
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: display.size,
    });
    const background = sources.find((s) => s.display_id === String(display.id)).thumbnail;
    const raw = background.toBitmap(),
      size = background.getSize();
    const frame = await main.capturePage(
      { x: Math.round(pane.x), y: 250, width: 60, height: 1 },
      { stayHidden: true },
    );
    const pixels = frame.toBitmap(),
      scale = frame.getSize().width / 60;
    let displacement = 0;
    for (let depth = 3; depth < 22; depth++) {
      const actualIndex = Math.round(depth * scale) * 4;
      const sx = Math.round(
        ((bounds.x - display.bounds.x + pane.x + depth) / display.bounds.width) * size.width,
      );
      const sy = Math.round(
        ((bounds.y - display.bounds.y + 250) / display.bounds.height) * size.height,
      );
      const original = (sy * size.width + sx) * 4;
      const observed = pixels[actualIndex + 2] - pixels[actualIndex];
      const flat = (raw[original + 2] - raw[original]) * 0.75;
      displacement = Math.max(displacement, Math.abs(observed - flat));
    }
    return { displacement };
  }, pane);
  expect(result.displacement).toBeGreaterThan(55);
  const before = await pixel();
  await backdrop('linear-gradient(135deg, rgb(220,45,100), rgb(30,120,225))');
  await page.waitForTimeout(250);
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((w) => w.getTitle() !== 'Optics test fixture');
    const b = w.getBounds();
    w.setBounds({ ...b, x: b.x + 25, y: b.y + 15 });
  });
  await expect(page.locator('html')).toHaveAttribute('data-optical-glass', 'ready');
  await expect
    .poll(async () =>
      app.evaluate(async ({ BrowserWindow, desktopCapturer, screen }) => {
        const main = BrowserWindow.getAllWindows().find(
          (w) => w.getTitle() !== 'Optics test fixture',
        );
        const bounds = main.getBounds(),
          display = screen.getDisplayMatching(bounds);
        const source = (
          await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: display.size })
        ).find((s) => s.display_id === String(display.id));
        const sourceSize = source.thumbnail.getSize(),
          original = source.thumbnail.toBitmap();
        const x = Math.round(
          ((bounds.x - display.bounds.x + 405) / display.bounds.width) * sourceSize.width,
        );
        const y = Math.round(
          ((bounds.y - display.bounds.y + 260) / display.bounds.height) * sourceSize.height,
        );
        const expected = original.subarray(
          (y * sourceSize.width + x) * 4,
          (y * sourceSize.width + x) * 4 + 3,
        );
        const actual = (
          await main.capturePage({ x: 405, y: 260, width: 1, height: 1 }, { stayHidden: true })
        ).toBitmap();
        return Math.max(
          ...[0, 1, 2].map((i) =>
            Math.abs(actual[i] - (expected[i] * 0.75 + [31, 19, 14][i] * 0.25)),
          ),
        );
      }),
    )
    .toBeLessThan(18);
  expect(before.a).toBe(255);
  await setTransparency(100);
  await expect(page.locator('html')).not.toHaveAttribute('data-optical-glass', 'ready');
  await expect(page.locator('.live-glass-canvas')).not.toBeVisible();
  await expect.poll(async () => (await pixel()).a).toBe(0);
  await setTransparency(0);
  await expect.poll(async () => (await pixel()).a).toBe(255);
  console.log(
    `Live glass: changing desktop pixels, convex-edge hue displacement ${result.displacement.toFixed(1)}, window movement, 0/100 endpoints and cleared capture verified.`,
  );
} finally {
  await app.evaluate(({ app }) => app.exit(0));
  await app.close().catch(() => {});
  await rm(profile, { recursive: true, force: true });
}
