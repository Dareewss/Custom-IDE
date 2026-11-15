import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';

for (const [size, lines] of [
  ['small', 25],
  ['medium', 50],
  ['large', 250],
] as const)
  test(`audits real ${lines}-line layered-view fixture`, async ({ page }) => {
    test.setTimeout(120000);
    const source = await readFile(`tests/fixtures/python/bug_${size}_${lines}.py`, 'utf8');
    expect(source.trimEnd().split('\n')).toHaveLength(lines);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
    const zip = new JSZip();
    zip.file('main.py', source);
    await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
      name: `Layers ${size}.zip`,
      mimeType: 'application/zip',
      buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    });
    const panel = page.getByRole('region', { name: 'Code overview', exact: true });
    const canvas = page.locator('.code-canvas canvas');
    await expect(panel).toHaveAttribute('aria-busy', 'false');
    await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/, { timeout: 30000 });
    await page
      .getByRole('group', { name: 'Workspace layout', exact: true })
      .getByRole('button', { name: '3D', exact: true })
      .click();
    await page.getByRole('button', { name: 'Fit all objects (Home)', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
    await page.addStyleTag({ content: 'body { background: #202522; }' });
    const folder = 'docs/screenshots/phase2.5';
    await mkdir(folder, { recursive: true });
    await page.screenshot({ path: `${folder}/baseline-${size}.png` });
    const metrics = await panel.evaluate((element) => ({
      nodes: element.dataset.modelNodes,
      visible: element.dataset.visibleNodes,
      analysisMs: element.dataset.analysisMs,
      layoutMs: element.dataset.layoutMs,
      canvas: element.querySelector('.code-canvas canvas')?.getBoundingClientRect().toJSON(),
    }));
    await writeFile(`${folder}/baseline-${size}.json`, JSON.stringify(metrics, null, 2));
    expect(Number(metrics.nodes)).toBeGreaterThan(20);
    expect(metrics.canvas.width).toBeGreaterThan(200);
    expect(metrics.canvas.height).toBeGreaterThan(150);
    expect(errors).toEqual([]);
  });
