import { test, expect } from '@playwright/test';

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
  await expect(dialog).toHaveCSS('backdrop-filter', 'blur(24px) saturate(1.6)');
  await expect(dialog).toHaveCSS('background-color', 'rgba(18, 18, 22, 0.97)');
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
  await expect(page.getByRole('checkbox', { name: /^Desktop blur/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Desktop blur/ })).toBeDisabled();
  for (const [value, alpha] of [
    [0, 0.84],
    [50, 0.43],
    [100, 0.02],
  ]) {
    await slider.fill(String(value));
    await expect(page.locator('.background-pane')).toHaveCSS(
      'background-color',
      `rgba(18, 18, 22, ${alpha})`,
    );
    await expect(page.locator('.background-pane')).toHaveCSS('backdrop-filter', 'blur(5px)');
    await expect(page.locator('.workspace')).toHaveCSS('opacity', '1');
  }
  await page.getByLabel('Color theme').selectOption('light');
  await expect(page.locator('.background-pane')).toHaveCSS(
    'background-color',
    'rgba(250, 250, 252, 0.03)',
  );
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
