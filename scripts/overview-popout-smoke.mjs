import { _electron, expect } from '@playwright/test';
import { mkdtemp, rm, cp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import JSZip from 'jszip';

// Functional native QA only: every owned window stays hidden, with an isolated profile.
const profile = await mkdtemp(join(tmpdir(), 'atlas-popout-test-'));
if (!profile.startsWith(join(tmpdir(), 'atlas-popout-test-')))
  throw new Error('Unexpected test profile');
const env = {
  ...process.env,
  CODE_ATLAS_USER_DATA: profile,
  CODE_ATLAS_PORT: '0',
  CODE_ATLAS_TEST_MODE: '1',
};
delete env.ELECTRON_RUN_AS_NODE;
const executablePath = process.env.CODE_ATLAS_TEST_EXE;
if (!executablePath) {
  env.CODE_ATLAS_ASSETS_DIR = join(profile, 'bundled-build');
  await cp('dist', env.CODE_ATLAS_ASSETS_DIR, { recursive: true });
}
let application;
try {
  application = await _electron.launch({
    ...(executablePath
      ? { executablePath, args: [] }
      : { args: [resolve('desktop-out/main.cjs')] }),
    env,
  });
  const page = await application.firstWindow();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Native popout.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.code-canvas canvas')).toHaveAttribute('data-labels-ready', '4', {
    timeout: 30000,
  });
  const assertHidden = async (count) => {
    const states = await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map((window) => ({
        visible: window.isVisible(),
        node: window.webContents.getLastWebPreferences().nodeIntegration,
        sandbox: window.webContents.getLastWebPreferences().sandbox,
        isolated: window.webContents.getLastWebPreferences().contextIsolation,
      })),
    );
    expect(states).toHaveLength(count);
    for (const state of states)
      expect(state).toEqual({ visible: false, node: false, sandbox: true, isolated: true });
  };
  const open = async () => {
    const created = application.waitForEvent('window');
    await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
    const popup = await created;
    popup.setDefaultTimeout(30000);
    popup.on('pageerror', (error) => errors.push(error.message));
    await expect(popup.getByRole('button', { name: 'Dock 3D view', exact: true })).toBeVisible();
    await assertHidden(2);
    expect(
      await popup.evaluate(() => ({
        isolated: crossOriginIsolated,
        node: typeof window.require,
        native: !!window.codeAtlasDesktop,
      })),
    ).toEqual({ isolated: true, node: 'undefined', native: true });
    return popup;
  };
  await assertHidden(1);
  const popup = await open();
  await expect(popup.locator('.code-canvas canvas')).toHaveAttribute('data-labels-ready', '4', {
    timeout: 30000,
  });
  await popup.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await popup.getByRole('treeitem', { name: 'method add', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Ln 4, Col 5');
  await popup.getByRole('spinbutton', { name: 'Function Z offset', exact: true }).fill('1.5');
  await expect(
    popup.getByRole('spinbutton', { name: 'Function Z offset', exact: true }),
  ).toHaveValue('1.5');
  if (await page.evaluate(() => window.codeAtlasDesktop.supportsDesktopBlur)) {
    expect(await popup.evaluate(() => window.codeAtlasDesktop.setDesktopBlur(true))).toBe(true);
    expect(await page.evaluate(() => window.codeAtlasDesktop.setDesktopBlur(false))).toBe(false);
  }
  // Arbitrary URLs, wrong targets and nested windows must remain denied.
  expect(
    await page.evaluate(() => window.open('/overview-window.html', 'wrong-target') === null),
  ).toBe(true);
  expect(await popup.evaluate(() => window.open('https://example.com', 'external') === null)).toBe(
    true,
  );
  await assertHidden(2);
  await popup.getByRole('button', { name: 'Close window', exact: true }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(page.getByRole('treeitem', { name: 'method add', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await assertHidden(1);
  // Closing a child must not unregister the parent's appearance IPC handler.
  expect(await page.evaluate(() => window.codeAtlasDesktop.setDesktopBlur(false))).toBe(false);
  await expect(
    page.getByRole('spinbutton', { name: 'Function Z offset', exact: true }),
  ).toHaveValue('1.5');
  const reopened = await open();
  await expect(
    reopened.getByRole('spinbutton', { name: 'Function Z offset', exact: true }),
  ).toHaveValue('1.5');
  await reopened.getByRole('button', { name: 'Dock 3D view', exact: true }).click();
  await expect.poll(() => reopened.isClosed()).toBe(true);
  await assertHidden(1);
  const owned = await open();
  // Close through the renderer's real save-before-close path; the viewer must close too.
  await page.getByRole('button', { name: 'Close window', exact: true }).click();
  await expect.poll(() => owned.isClosed()).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'Hidden native pop-out: real 3D labels, shared selection, own controls/IPC, dock/reopen, parent close and window security passed.',
  );
} finally {
  if (application) {
    await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
    await application.close().catch(() => {});
  }
  await rm(profile, { recursive: true, force: true });
}
