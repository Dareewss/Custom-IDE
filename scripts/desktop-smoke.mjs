import { _electron, expect } from '@playwright/test';
import { mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import JSZip from 'jszip';

const profile = await mkdtemp(join(tmpdir(), 'atlas-native-test-'));
if (!profile.startsWith(join(tmpdir(), 'atlas-native-test-')))
  throw new Error('Unexpected test profile');
const probe = createServer();
await new Promise((done) => probe.listen(0, '127.0.0.1', done));
const port = probe.address().port;
await new Promise((done) => probe.close(done));
const env = { ...process.env, CODE_ATLAS_USER_DATA: profile, CODE_ATLAS_PORT: String(port) };
env.CODE_ATLAS_TEST_MODE = '1';
delete env.ELECTRON_RUN_AS_NODE;
const executablePath = process.env.CODE_ATLAS_TEST_EXE;
if (!executablePath) {
  env.CODE_ATLAS_ASSETS_DIR = join(profile, 'bundled-build');
  await cp('dist', env.CODE_ATLAS_ASSETS_DIR, { recursive: true });
}
let app;
let livePage;
const launch = async () => {
  app = await _electron.launch({
    ...(executablePath
      ? { executablePath, args: [] }
      : { args: [resolve('desktop-out/main.cjs')] }),
    env,
  });
  const page = await app.firstWindow();
  livePage = page;
  page.setDefaultTimeout(30000);
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text());
  });
  await expect(page.getByRole('button', { name: 'Manage projects', exact: true })).toBeVisible();
  return page;
};
const native = async () => {
  const properties = await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return {
      opacity: window.getOpacity(),
      background: window.getBackgroundColor(),
      bounds: window.getBounds(),
    };
  });
  const alpha = await livePage.locator('.background-pane').evaluate((element) => {
    const color = getComputedStyle(element).backgroundColor;
    return (color.startsWith('rgba') ? Number(color.slice(0, -1).split(',').at(-1)) : 1) * 255;
  });
  return { ...properties, alpha };
};
try {
  let page = await launch();
  expect(
    await page.evaluate(() => ({
      isolated: crossOriginIsolated,
      node: typeof window.require,
      native: Boolean(window.codeAtlasDesktop),
    })),
  ).toEqual({ isolated: true, node: 'undefined', native: true });
  await expect(page.getByText('Desktop app', { exact: true })).toBeVisible();
  const initial = await native();
  expect(initial.opacity).toBe(1);
  expect(initial.alpha).toBe(0);
  expect(initial.background).toMatch(/^#000000(00)?$/);

  for (const value of [100, 50, 0, 100]) {
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    const slider = page.getByRole('slider', { name: 'Background transparency', exact: true });
    await slider.press(value === 0 ? 'Home' : 'End');
    if (value === 50) for (let i = 0; i < 50; i++) await slider.press('ArrowLeft');
    await expect(slider).toHaveValue(String(value));
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await expect
      .poll(async () => (await native()).alpha)
      .toBeCloseTo(((100 - value) / 100) * 0.96 * 255, 1);
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isContentProtected(),
      ),
    ).toBe(false);
    expect((await native()).opacity).toBe(1);
    await expect(page.locator('.workspace')).toHaveCSS('opacity', '1');
  }
  console.log(
    'Native scene alpha follows slider to fully clear; foreground/window opacity preserved.',
  );

  const oldBounds = (await native()).bounds;
  await page.getByRole('button', { name: 'Expand or restore window' }).click();
  await expect.poll(async () => (await native()).bounds.width).toBeGreaterThan(oldBounds.width);
  expect((await native()).alpha).toBeLessThan(255);
  await page.getByRole('button', { name: 'Expand or restore window' }).click();
  await expect.poll(async () => (await native()).bounds).toEqual(oldBounds);
  await page.mouse.move(oldBounds.width - 2, oldBounds.height - 2);
  await page.mouse.down();
  await page.mouse.move(oldBounds.width - 32, oldBounds.height - 22, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await native()).bounds.width).toBeLessThan(oldBounds.width);
  expect((await native()).alpha).toBeLessThan(255);

  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const partialSlider = page.getByRole('slider', { name: 'Background transparency', exact: true });
  await partialSlider.press('End');
  for (let i = 0; i < 25; i++) await partialSlider.press('ArrowLeft');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  const zip = new JSZip();
  zip.file('main.py', 'from helper import greet\nname = input("Name? ")\ngreet(name)\n');
  zip.file('helper.py', 'def greet(name):\n    print("Native hello " + name)\n');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Native workspace.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Native workspace');
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await page.getByRole('textbox', { name: 'Program input' }).fill('Darius');
  await page.getByRole('button', { name: 'Send input' }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 30000 });
  await expect(page.getByRole('log')).toContainText('Native hello Darius');
  await expect(page.locator('.view-lines')).toHaveCSS('opacity', '1');

  const editor = page.getByRole('textbox', { name: 'Editor content' });
  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('value={"a":1}\nprint( value )\n');
  await page.getByRole('button', { name: 'Format Document', exact: true }).click();
  await expect(page.locator('.view-lines')).toContainText('print(value)');
  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('greeting = "hello"\ngreeting.up');
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Control+Space');
  await expect(page.locator('.suggest-widget')).toContainText('upper', { timeout: 30000 });
  await page.keyboard.press('Escape');
  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('def broken(\n');
  await page.getByRole('tab', { name: 'Problems', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Problems' })).toContainText('Python syntax');
  await page.getByRole('tab', { name: 'Console', exact: true }).click();
  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('while True:\n    pass\n');
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Running');
  await page.getByRole('button', { name: 'Stop (Shift+F5)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Stopped');
  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('print("Saved before desktop close")\n');
  const closed = app.waitForEvent('close');
  await page.getByRole('button', { name: 'Close window', exact: true }).click();
  await closed;
  app = undefined;
  page = await launch();
  await expect(page.locator('.workspace-title')).toContainText('Native workspace');
  await expect.poll(async () => (await native()).alpha).toBeLessThan(255);
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 30000 });
  await expect(page.getByRole('log')).toContainText('Saved before desktop close');
  console.log(
    'Native Python imports/stdin/Stop/restart, resizing and save-on-close persistence passed.',
  );
} catch (error) {
  const pages = app?.windows() ?? [];
  if (pages[0])
    console.error(
      'Native runtime output:',
      await pages[0]
        .getByRole('log')
        .innerText()
        .catch(() => 'No console'),
    );
  throw error;
} finally {
  if (app) {
    await app.evaluate(({ app }) => app.exit(0));
    await app.close().catch(() => {});
  }
  await rm(profile, { recursive: true, force: true });
}
