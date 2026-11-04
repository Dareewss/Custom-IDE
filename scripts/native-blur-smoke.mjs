import { _electron, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { promisify } from 'node:util';

// Functional IPC/API checks only: this fixture never shows or moves a window.
const execute = promisify(execFile);
const profile = await mkdtemp(join(tmpdir(), 'atlas-native-blur-test-'));
const env = {
  ...process.env,
  CODE_ATLAS_TEST_MODE: '1',
  CODE_ATLAS_USER_DATA: profile,
  CODE_ATLAS_PORT: '0',
};
delete env.ELECTRON_RUN_AS_NODE;
if (!profile.startsWith(join(tmpdir(), 'atlas-native-blur-test-')))
  throw new Error('Unexpected test profile');
const executablePath = process.env.CODE_ATLAS_TEST_EXE;
let application;
try {
  application = await _electron.launch({
    ...(executablePath
      ? { executablePath, args: [] }
      : { args: [resolve('desktop-out/main.cjs')] }),
    env,
  });
  const page = await application.firstWindow();
  await page.getByRole('button', { name: 'Manage projects', exact: true }).waitFor();
  const target = await application.evaluate(({ BrowserWindow, app }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return {
      visible: window.isVisible(),
      opacity: window.getOpacity(),
      background: window.getBackgroundColor(),
      handle: window.getNativeWindowHandle().readBigUInt64LE().toString(),
      owner: process.pid,
      helper: app.isPackaged
        ? `${process.resourcesPath}/app.asar.unpacked/desktop/native-blur.exe`
        : `${app.getAppPath()}/native-blur.exe`,
    };
  });
  expect(target.visible).toBe(false);
  expect(target.opacity).toBe(1);
  expect(target.background).toMatch(/^#000000(00)?$/);
  expect(await page.evaluate(() => window.codeAtlasDesktop.supportsDesktopBlur)).toBe(true);
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Desktop blur/ })).toBeChecked();
  expect(await page.evaluate(() => window.codeAtlasDesktop.setDesktopBlur(true))).toBe(true);
  expect(await application.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe('dark');
  expect(
    await page.evaluate(() =>
      Promise.all(
        [true, false, true, false].map((enabled) =>
          window.codeAtlasDesktop.setDesktopBlur(enabled),
        ),
      ),
    ),
  ).toEqual([true, false, true, false]);
  await expect(
    page.evaluate(() => window.codeAtlasDesktop.setDesktopBlur('invalid')),
  ).rejects.toThrow('Invalid appearance request');
  for (const [handle, owner] of [
    ['0', target.owner],
    [target.handle, target.owner + 1],
  ]) {
    await expect(
      execute(target.helper, [handle, String(owner), 'on'], { windowsHide: true, timeout: 5000 }),
    ).rejects.toThrow('Window does not belong');
  }
  for (const state of ['on', 'off']) {
    const { stdout } = await execute(target.helper, [target.handle, String(target.owner), state], {
      windowsHide: true,
      timeout: 5000,
    });
    expect(JSON.parse(stdout)).toEqual({
      accepted: true,
      enabled: state === 'on',
      accentState: state === 'on' ? 4 : 0,
      tintAlpha: state === 'on' ? 1 : 0,
    });
  }
  expect(
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()),
  ).toBe(false);
  await expect(page.locator('.scene')).toHaveAttribute('data-motion', 'hidden');
  await expect(page.getByRole('alert')).toHaveCount(0);
  console.log(
    'Native setter accepted on/off; ownership, ordered IPC, defaults, theme and hidden window verified. Native appearance requires manual review.',
  );
} finally {
  if (application) {
    await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
    await application.close().catch(() => {});
  }
  await rm(profile, { recursive: true, force: true });
}
