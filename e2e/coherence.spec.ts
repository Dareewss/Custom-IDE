import { test, expect, type Page } from '@playwright/test';

async function squareControls(page: Page) {
  const rounded = await page
    .locator('.glass, .background-pane, button, input, select, kbd, .file-tab, .tree-row')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const css = getComputedStyle(node);
          if (!node.getClientRects().length || css.visibility === 'hidden') return false;
          return [
            css.borderTopLeftRadius,
            css.borderTopRightRadius,
            css.borderBottomLeftRadius,
            css.borderBottomRightRadius,
          ].some((radius) => Number.parseFloat(radius) !== 0);
        })
        .map((node) => node.className || node.tagName),
    );
  expect(rounded).toEqual([]);
}

test('provides one primary entry per action and preserves workbench selection on toggle', async ({
  page,
}) => {
  await page.goto('/');
  const projects = page.getByRole('button', { name: 'Manage projects', exact: true });
  await expect(projects).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true })).toHaveCount(1);
  for (const label of [
    'Toggle explorer',
    'Hide explorer',
    'Toggle bottom panel',
    'Close bottom panel',
    'Open local workspace settings',
    'Code Atlas home',
    'Browse projects',
    'Open all commands',
    'All commands',
    'Format file',
  ])
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Format Document', exact: true })).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Save workspace (Ctrl+S)', exact: true }),
  ).toHaveCount(1);
  const explorer = page.getByRole('button', { name: 'Explorer', exact: true });
  await explorer.click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await explorer.click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.getByRole('tab', { name: 'Variables', exact: true }).click();
  const workbench = page.getByRole('button', { name: 'Workbench', exact: true });
  await workbench.click();
  await expect(page.locator('.output-card')).toHaveCount(0);
  await workbench.click();
  await expect(page.getByRole('tabpanel', { name: 'Variables' })).toBeVisible();
  await projects.click();
  await expect(page.getByRole('dialog', { name: 'Project manager' })).toBeVisible();
  await page.getByRole('button', { name: 'Close projects', exact: true }).click();
  await page.keyboard.press('Control+Space');
  await page.getByRole('combobox').fill('import zip');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Manage projects', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Project manager' })).toBeVisible();
  await page.getByRole('button', { name: 'Close projects', exact: true }).click();
  await page.getByRole('button', { name: 'Save workspace (Ctrl+S)', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Saved');
});

test('keeps square geometry in both themes, compact layout, menus and dialogs', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).waitFor();
  for (const theme of ['dark', 'light']) {
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    await page.getByLabel('Color theme').selectOption(theme);
    await squareControls(page);
    await page.getByRole('checkbox', { name: /^Word wrap/ }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox', { name: /^Word wrap/ })).toBeChecked();
    await expect(
      page.getByRole('button', { name: 'Close settings', exact: true }),
    ).toBeInViewport();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 960 });
      await squareControls(page);
      await expect(
        page.getByRole('button', { name: 'Manage projects', exact: true }),
      ).toBeInViewport();
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await squareControls(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Space');
    await expect(page.getByRole('dialog', { name: 'Command palette', exact: true })).toBeVisible();
    await squareControls(page);
    await page.keyboard.press('Escape');
    // Reset the preference to verify keyboard toggling in the next theme too.
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    await page.getByRole('checkbox', { name: /^Word wrap/ }).uncheck();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  }
  await expect(page.locator('.scene-shape-1')).toHaveCSS('border-radius', '50%');
});
