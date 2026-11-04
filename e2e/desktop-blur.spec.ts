import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      blurCalls: [] as boolean[],
      failBlur: false,
      codeAtlasDesktop: {
        supportsDesktopBlur: true,
        setTheme: () => {},
        onCloseRequested: () => () => {},
        ready: () => {},
        close: () => {},
        minimize: () => {},
        toggleExpand: () => {},
        resize: () => {},
        setDesktopBlur: async (enabled: boolean) => {
          const state = window as unknown as { blurCalls: boolean[]; failBlur: boolean };
          state.blurCalls.push(enabled);
          if (state.failBlur) throw new Error('Windows rejected desktop blur');
          return enabled;
        },
      },
    });
  });
});

test('upgrades desktop blur once, retains other preferences and persists an opt-out', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('atlas-settings'))
      localStorage.setItem(
        'atlas-settings',
        JSON.stringify({
          version: 10,
          state: { desktopBlur: false, backgroundTransparency: 73, blurStrength: 6, fontSize: 18 },
        }),
      );
  });
  await page.goto('/');
  const calls = () =>
    page.evaluate(() => (window as unknown as { blurCalls: boolean[] }).blurCalls);
  await expect.poll(calls).toContain(true);
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const desktop = page.getByRole('checkbox', { name: /^Desktop blur/ });
  await expect(desktop).toBeChecked();
  await expect(
    page.getByRole('slider', { name: 'Background transparency', exact: true }),
  ).toHaveValue('73');
  await expect(page.getByRole('slider', { name: 'Interface blur', exact: true })).toHaveValue('6');
  await expect(page.getByLabel('Editor font size')).toHaveValue('18');
  await desktop.uncheck();
  await expect.poll(async () => (await calls()).at(-1)).toBe(false);
  await page.reload();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(desktop).not.toBeChecked();
  await expect.poll(async () => (await calls()).at(-1)).toBe(false);
  await desktop.check();
  await page.getByRole('checkbox', { name: /^Performance mode/ }).check();
  await expect.poll(async () => (await calls()).at(-1)).toBe(false);
  await page.getByRole('checkbox', { name: /^Performance mode/ }).uncheck();
  await expect.poll(async () => (await calls()).at(-1)).toBe(true);
});

test('reports native blur failure while retaining usable transparent backgrounds', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const desktop = page.getByRole('checkbox', { name: /^Desktop blur/ });
  await desktop.uncheck();
  await page.evaluate(() => {
    (window as unknown as { failBlur: boolean }).failBlur = true;
  });
  await desktop.check();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Windows rejected desktop blur');
  await expect(page.locator('.editor-card')).toHaveCSS('background-color', 'rgba(18, 18, 22, 0)');
  await page.getByRole('button', { name: 'Dismiss error', exact: true }).click();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace settings' })).toBeVisible();
});
