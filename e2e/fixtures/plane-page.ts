import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

export async function importPlaneFixture(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/bug_small_25.py', 'utf8'));
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Flat.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/);
  await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/);
  await expect
    .poll(
      async () =>
        (await canvas.getAttribute('data-structure-scale')) ===
        (await canvas.getAttribute('data-requested-scale')),
    )
    .toBe(true);
  return canvas;
}
