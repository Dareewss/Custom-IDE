import { test, expect, type Page } from '@playwright/test';

async function floating(page: Page, name = 'Command palette') {
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('position', 'fixed');
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
  expect(box!.y).toBeGreaterThanOrEqual(15);
  expect(box!.y).toBeLessThanOrEqual(viewport.height * 0.25);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height - 15);
  expect(box!.x).toBeGreaterThanOrEqual(15);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width - 15);
}

test('floats search above the unchanged workspace and supports click, filtering and keyboard selection', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /Search commands/ });
  await expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+Space');
  await expect(trigger).toContainText('Ctrl Space');
  const before = await page.locator('.workspace').boundingBox();
  await trigger.click();
  await floating(page);
  expect(await page.locator('.workspace').boundingBox()).toEqual(before);
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.getByRole('combobox').fill('New file');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'New file', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await trigger.click();
  await page.locator('[cmdk-overlay]').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('dialog', { name: 'Command palette', exact: true })).toHaveCount(0);
});

test('Ctrl+Space opens search from the editor without inserting text or stealing manual completion', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('treeitem', { name: 'main.py', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  await editor.focus();
  const before = await page.locator('.view-lines').innerText();
  await page.keyboard.press('Control+Space');
  await floating(page);
  await expect(page.getByRole('combobox')).toBeFocused();
  expect(await page.locator('.view-lines').innerText()).toBe(before);
  await expect(page.locator('.suggest-widget')).not.toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeFocused();
  await editor.press('Control+A');
  await page.keyboard.insertText('greeting = "hello"\ngreeting.up');
  await editor.press('Control+End');
  await editor.press('Escape');
  await editor.press('Control+Alt+Space');
  await expect(page.locator('.suggest-widget')).toContainText('upper', { timeout: 30000 });
  await expect(page.getByRole('dialog', { name: 'Command palette', exact: true })).toHaveCount(0);
});

test('keeps search and file search fully visible on short and compact screens', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).waitFor();
  for (const viewport of [
    { width: 375, height: 480 },
    { width: 1024, height: 280 },
  ]) {
    await page.setViewportSize(viewport);
    await page.keyboard.press('Control+Space');
    await floating(page);
    const list = page.locator('[cmdk-list]');
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await page.keyboard.press('End');
    await expect(page.locator('[cmdk-item][data-selected="true"]')).toBeInViewport();
    await expect(page.getByRole('combobox')).toBeInViewport();
    expect(await page.locator('.command-dialog').evaluate((el) => el.scrollTop)).toBe(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+p');
    await floating(page, 'Quick open file');
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await page.getByLabel('Editor font size').focus();
  await page.keyboard.press('Control+Space');
  await expect(page.getByRole('dialog', { name: 'Workspace settings', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Command palette', exact: true })).toHaveCount(0);
});
