import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

for (const reducedMotion of ['no-preference', 'reduce'] as const)
  test(`re-layouts real files and returns to demand idle (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const zip = new JSZip();
    for (const file of ['main.py', 'helper.py'])
      zip.file(file, await readFile(`tests/fixtures/python/connections/${file}`, 'utf8'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
    await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
      name: 'Layout.zip',
      mimeType: 'application/zip',
      buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    });
    await expect(page.locator('.workspace-title')).toContainText('Layout');
    const panel = page.getByRole('region', { name: 'Code overview', exact: true });
    const canvas = panel.locator('.code-canvas canvas');
    await expect(canvas).toHaveAttribute('data-labels-ready', '7');
    await page.waitForTimeout(700);
    const before = Number(await canvas.getAttribute('data-render-frames'));
    const image = await canvas.screenshot({ omitBackground: true });
    await page.getByRole('button', { name: 'Re-layout graph', exact: true }).click();
    await expect(panel).toHaveAttribute('aria-busy', 'false');
    await expect
      .poll(() => canvas.getAttribute('data-render-frames').then(Number))
      .toBeGreaterThan(before);
    await page.waitForTimeout(reducedMotion === 'reduce' ? 500 : 1600);
    const settled = await canvas.getAttribute('data-render-frames');
    await page.waitForTimeout(400);
    expect(await canvas.getAttribute('data-render-frames')).toBe(settled);
    expect((await canvas.screenshot({ omitBackground: true })).equals(image)).toBe(false);
    await expect(panel).toHaveAttribute('data-model-nodes', '12');
  });
