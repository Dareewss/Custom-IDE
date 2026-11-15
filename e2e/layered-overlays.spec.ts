import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });
test('renders actual syntax/uncertainty markers and updates a Monaco breakpoint without execution', async ({
  page,
}) => {
  const canvas = await importPlaneFixture(page, { 'broken.py': 'def broken(:\n    missing()\n' });
  await page.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
  await expect(canvas).toHaveAttribute('data-layer-progress', '1');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-overlay-errors')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-overlay-warnings')))
    .toBeGreaterThan(0);
  const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
  await editor.focus();
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('F9');
  await expect(canvas).toHaveAttribute('data-overlay-breakpoints', '1');
  await page.keyboard.press('F9');
  await expect(canvas).toHaveAttribute('data-overlay-breakpoints', '0');
  await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
  await page
    .getByRole('complementary', { name: 'Structure inspector', exact: true })
    .getByText(/^Markers /)
    .click();
  await expect(
    page.getByRole('complementary', { name: 'Structure inspector', exact: true }),
  ).toContainText('Unresolved');
});
