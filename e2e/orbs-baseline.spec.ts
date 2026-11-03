import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1422, height: 1000 }, reducedMotion: 'reduce' });

for (const preset of ['neon', 'ocean', 'nebula']) {
  test(`${preset} orbs retain the established resting composition`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    await page.getByLabel('Background preset').selectOption(preset);
    await page.getByRole('checkbox', { name: /^Background animation/ }).uncheck();
    await page.getByRole('slider', { name: 'Background transparency', exact: true }).fill('88');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.addStyleTag({
      content: `
      .workspace, .background-pane { visibility: hidden !important; }
      .scene, html, body, #root { background: transparent !important; }
    `,
    });
    await expect(page).toHaveScreenshot(`${preset}-orbs.png`, {
      omitBackground: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.001,
    });
  });
}
