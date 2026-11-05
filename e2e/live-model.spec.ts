import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

for (const reducedMotion of ['no-preference', 'reduce'] as const)
  test(`updates real structure incrementally without stale project nodes (${reducedMotion})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion });
    const original = 'def stable(value):\n    result = value + 1\n    return result\n';
    const zip = new JSZip();
    zip.file('main.py', original);
    await page.goto('/');
    await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
    await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
      name: 'Live.zip',
      mimeType: 'application/zip',
      buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    });
    await expect(page.locator('.workspace-title')).toContainText('Live');
    const panel = page.getByRole('region', { name: 'Code overview', exact: true }),
      canvas = page.locator('.code-canvas canvas');
    await expect(panel).toHaveAttribute('data-model-nodes', '4');
    const editor = page.getByRole('textbox', { name: 'Editor content' });
    await editor.focus();
    await editor.press('Control+End');
    await editor.press('Control+Home');
    await expect(page.getByRole('tooltip').locator('strong')).toHaveText('stable');
    const id = await panel.getAttribute('data-selected-node');
    await editor.press('Control+A');
    await page.keyboard.insertText(original + '\nextra = 2\n');
    await page.waitForTimeout(150);
    await expect(panel).toHaveAttribute('data-model-nodes', '4');
    await expect(panel).toHaveAttribute('data-model-nodes', '5');
    await expect(panel).toHaveAttribute('data-added-nodes', '1');
    await expect(panel).toHaveAttribute('data-selected-node', id!);
    await editor.press('Control+A');
    await page.keyboard.insertText(original);
    await expect(panel).toHaveAttribute('data-model-nodes', '4');
    await expect(panel).toHaveAttribute('data-removed-nodes', '1');
    if (reducedMotion === 'no-preference')
      await expect(canvas).toHaveAttribute('data-ghost-count', '1');
    await expect(canvas).toHaveAttribute('data-ghost-count', '0');
    await editor.press('Control+A');
    await page.keyboard.insertText('def stable(:\n    value =\n');
    await expect(
      page.getByText('Some code is incomplete. Showing recovered structure.', { exact: true }),
    ).toBeVisible();
    await editor.press('Control+A');
    await page.keyboard.insertText(original);
    await expect(panel).toHaveAttribute('data-model-nodes', '4');
    await expect(
      page.getByText('Some code is incomplete. Showing recovered structure.', { exact: true }),
    ).toHaveCount(0);
    await page.waitForTimeout(600);
    const frames = await canvas.getAttribute('data-render-frames');
    await page.waitForTimeout(400);
    expect(await canvas.getAttribute('data-render-frames')).toBe(frames);
    await editor.press('Control+End');
    await page.keyboard.insertText('\nnew_only = 3\n');
    const fresh = new JSZip();
    fresh.file('main.py', 'fresh = 9\n');
    await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
    await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
      name: 'Fresh.zip',
      mimeType: 'application/zip',
      buffer: await fresh.generateAsync({ type: 'nodebuffer' }),
    });
    await expect(page.locator('.workspace-title')).toContainText('Fresh');
    await expect(panel).toHaveAttribute('data-model-nodes', '2');
    const search = page.getByRole('combobox', { name: 'Search 3D objects', exact: true });
    await search.fill('new_only');
    await expect(page.getByText('No objects match this search.', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
