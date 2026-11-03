import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });
test('shares persisted live controls between header, settings and commands', async ({ page }) => {
  await page.goto('/');
  const animation = page.getByRole('button', { name: 'Toggle orb animation', exact: true });
  const orbs = page.getByRole('button', { name: 'Toggle orbs', exact: true });
  await expect(animation).toHaveAttribute('aria-pressed', 'true');
  await animation.focus();
  await page.keyboard.press('Space');
  await expect(animation).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.scene')).toHaveAttribute('data-motion', 'idle');
  await orbs.click();
  await expect(orbs).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(animation).toHaveAttribute('aria-pressed', 'false');
  await expect(orbs).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Background animation/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Background blobs/ })).not.toBeChecked();
  await page.getByRole('slider', { name: 'Animation speed', exact: true }).fill('0.25');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  for (const name of ['Toggle orbs', 'Toggle orb animation']) {
    await page.getByRole('button', { name: /Search commands/ }).click();
    await page.getByRole('combobox').fill(name);
    await page.getByRole('option', { name, exact: true }).click();
  }
  await expect(animation).toHaveAttribute('aria-pressed', 'true');
  await expect(orbs).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.scene')).toHaveAttribute('data-motion', 'running');
  await page.reload();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Animation speed', exact: true })).toHaveValue(
    '0.25',
  );
});

test('keeps controls usable at compact widths and honors system motion preference', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle orbs', exact: true }).waitFor();
  for (const width of [1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await page
      .locator('.titlebar')
      .evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    for (const name of ['Toggle orb animation', 'Toggle orbs']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport();
      await button.click();
      await button.click();
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const animation = page.getByRole('button', { name: 'Toggle orb animation', exact: true });
  await expect(animation).toBeDisabled();
  await expect(animation).toHaveAttribute('aria-pressed', 'false');
  await expect(animation).toHaveAttribute('title', /system preferences/);
  await expect(page.locator('.scene')).toHaveAttribute('data-motion', 'reduced');
});
