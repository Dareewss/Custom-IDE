import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('searches real hidden objects, filters types, dims the scene and opens from the command palette', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Search.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Search');
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-labels-ready', '4');
  const scenePixels = async () => {
    const style = await page.addStyleTag({
      content:
        '.workspace *{visibility:hidden!important}.code-canvas,.code-canvas canvas{visibility:visible!important}.background-pane,.orb-plane{visibility:hidden!important}html,body,#root,.layer-stack,.workspace,.glass{background:transparent!important;backdrop-filter:none!important;border-color:transparent!important;box-shadow:none!important}',
    });
    const png = await canvas.screenshot({ omitBackground: true });
    await style.evaluate((element) => element.remove());
    return png;
  };
  const before = await scenePixels();
  const input = page.getByRole('combobox', { name: 'Search 3D objects', exact: true });
  await page.getByLabel('Object kind filter', { exact: true }).selectOption('function');
  await input.fill('doubled');
  const results = page.getByRole('listbox', { name: '3D object results', exact: true });
  await expect(results.getByRole('option')).toHaveCount(1);
  expect((await scenePixels()).equals(before)).toBe(false);
  await input.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('Ln 8, Col 1');
  await input.fill('not_found');
  await expect(page.getByText('No objects match this search.', { exact: true })).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await page.getByLabel('Object kind filter', { exact: true }).selectOption('variable');
  await input.fill('main.py');
  await expect(results.getByRole('option')).toHaveCount(5);
  await input.press('Escape');
  await page.getByLabel('3D detail level', { exact: true }).selectOption('files');
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-visible-nodes',
    '1',
  );
  await input.fill('total');
  await input.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('Ln 5, Col 9');
  await expect(page.getByLabel('3D detail level', { exact: true })).toHaveValue('all');
  await page
    .getByRole('group', { name: 'Workspace layout', exact: true })
    .getByRole('button', { name: 'Code', exact: true })
    .click();
  await page.keyboard.press('Control+Space');
  const palette = page.getByRole('dialog', { name: 'Command palette', exact: true });
  await palette.getByRole('combobox').fill('Search 3D objects');
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();
  await input.fill('amount');
  await expect(results.getByRole('option')).toHaveCount(1);
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.locator('.statusbar')).toContainText('Ln 4, Col 19');
});
