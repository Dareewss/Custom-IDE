import { test, expect } from '@playwright/test';
import { materialAlphas } from '../src/features/appearance/material';

test('migrates existing frost to a clear background once and preserves motion/editor settings', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('atlas-settings'))
      localStorage.setItem(
        'atlas-settings',
        JSON.stringify({
          version: 9,
          state: {
            backgroundTransparency: 25,
            blurStrength: 36,
            desktopBlur: true,
            fontSize: 18,
            backgroundBlobs: true,
            backgroundAnimation: true,
            animationSpeed: 1.25,
          },
        }),
      );
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const transparency = page.getByRole('slider', { name: 'Background transparency', exact: true });
  await expect(transparency).toHaveValue('100');
  await expect(page.getByRole('slider', { name: 'Blur strength', exact: true })).toHaveValue('4');
  await expect(page.getByRole('checkbox', { name: /^Desktop blur/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Background blobs/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Background animation/ })).toBeChecked();
  await expect(page.getByLabel('Editor font size')).toHaveValue('18');
  await expect(page.getByRole('slider', { name: 'Animation speed', exact: true })).toHaveValue(
    '1.25',
  );
  await expect(page.locator('.editor-card')).toHaveCSS('background-color', 'rgba(18, 18, 22, 0)');
  await expect(page.locator('.editor-card')).toHaveCSS('background-image', 'none');
  await transparency.fill('30');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(transparency).toHaveValue('30');
});

test('maps live materials independently while keeping text opaque over extreme backdrops', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const textColors = new Map<string, string>();
  for (const theme of ['dark', 'light'] as const) {
    await page.getByLabel('Color theme').selectOption(theme);
    await page.evaluate((mode) => {
      document.body.style.background = mode === 'dark' ? '#fff' : '#000';
    }, theme);
    for (const slider of [0, 50, 100]) {
      await page
        .getByRole('slider', { name: 'Background transparency', exact: true })
        .fill(String(slider));
      const expected = materialAlphas(slider, theme);
      const actual = await page.evaluate(() => {
        const color = (selector: string) =>
          getComputedStyle(document.querySelector(selector)!).backgroundColor;
        return {
          backing: color('.background-pane'),
          editor: color('.editor-card'),
          panel: color('.titlebar'),
          elevated: color('.settings-dialog'),
          text: getComputedStyle(document.querySelector('.brand-wordmark')!).color,
          opacity: getComputedStyle(document.querySelector('.brand-wordmark')!).opacity,
          grain: getComputedStyle(document.querySelector('.editor-card')!, '::after').content,
        };
      });
      for (const key of ['backing', 'editor', 'panel', 'elevated'] as const)
        expect(
          Math.abs(Number(actual[key].match(/, ([\d.]+)\)$/)![1]) - expected[key]),
        ).toBeLessThanOrEqual(1 / 255);
      if (!textColors.has(theme)) textColors.set(theme, actual.text);
      expect(actual.text).toBe(textColors.get(theme));
      expect(actual.opacity).toBe('1');
      expect(actual.grain).toBe('none');
      await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', 'blur(4px)');
    }
  }
});

test('keeps creation dialogs outside blurred surfaces with a stronger smoky material', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Search files and commands/ }).click();
  await page.getByRole('combobox').fill('New file');
  await page.getByRole('option', { name: 'New file', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New file', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.parentElement === document.body)).toBe(true);
  await expect(dialog).toHaveCSS('backdrop-filter', 'blur(4px)');
  await expect(dialog).toHaveCSS('background-color', 'rgba(18, 18, 22, 0.94)');
  await expect(dialog.locator('form')).toHaveCSS('opacity', '1');
  await dialog.getByLabel('Project path').fill('frost.py');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
});

test('keeps the colorless backing translucent and lightly frosted throughout the slider', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Background transparency', exact: true });
  await expect(page.getByRole('checkbox', { name: /^Desktop blur/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Desktop blur/ })).toBeDisabled();
  for (const [value, alpha] of [
    [0, 0.96],
    [50, 0.48],
    [100, 0],
  ]) {
    await slider.fill(String(value));
    await expect(page.locator('.background-pane')).toHaveCSS(
      'background-color',
      `rgba(18, 18, 22, ${alpha})`,
    );
    await expect(page.locator('.background-pane')).toHaveCSS('backdrop-filter', 'blur(4px)');
    await expect(page.locator('.workspace')).toHaveCSS('opacity', '1');
  }
  await page.getByLabel('Color theme').selectOption('light');
  await expect(page.locator('.background-pane')).toHaveCSS(
    'background-color',
    'rgba(250, 250, 252, 0)',
  );
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
