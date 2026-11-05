import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('draws real directional connections, dashed uncertainty and toggleable external cluster', async ({
  page,
}) => {
  const zip = new JSZip();
  for (const file of ['main.py', 'helper.py'])
    zip.file(file, await readFile(`tests/fixtures/python/connections/${file}`, 'utf8'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Connections.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Connections');
  await page
    .getByRole('group', { name: 'Workspace layout', exact: true })
    .getByRole('button', { name: '3D', exact: true })
    .click();
  const canvas = page.locator('.code-canvas canvas');
  await expect.poll(() => canvas.getAttribute('data-edge-count').then(Number)).toBeGreaterThan(4);
  const total = Number(await canvas.getAttribute('data-edge-count'));
  await expect
    .poll(() => canvas.getAttribute('data-dashed-edge-count').then(Number))
    .toBeGreaterThan(0);
  await page.locator('.overview-options summary').click();
  await page.getByLabel('Calls', { exact: true }).uncheck();
  await expect.poll(() => canvas.getAttribute('data-edge-count').then(Number)).toBeLessThan(total);
  await page.getByLabel('Imports', { exact: true }).uncheck();
  await expect(canvas).toHaveAttribute('data-edge-count', '1');
  await page.getByLabel('Inheritance', { exact: true }).uncheck();
  await expect(canvas).toHaveAttribute('data-edge-count', '0');
  for (const name of ['Calls', 'Imports', 'Inheritance'])
    await page.getByLabel(name, { exact: true }).check();
  await expect(canvas).toHaveAttribute('data-edge-count', String(total));
  await page.getByLabel('External symbols', { exact: true }).uncheck();
  await expect(canvas).toHaveAttribute('data-dashed-edge-count', '0');
  await page.getByLabel('External symbols', { exact: true }).check();
  await page.getByLabel('Expand external cluster', { exact: true }).check();
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) =>
          JSON.parse(el.getAttribute('data-geometry-counts') ?? '{}').IcosahedronGeometry ?? 0,
      ),
    )
    .toBeGreaterThan(1);
  await page.getByLabel('Expand external cluster', { exact: true }).uncheck();
  await page.locator('.overview-options summary').click();
  await expect(canvas).toHaveAttribute('data-edge-count', String(total));
  await page.screenshot({ path: 'docs/screenshots/phase2/graph-edges.png' });
  const hit = await canvas.evaluate(async (element) => {
    const box = element.getBoundingClientRect();
    for (let y = box.height * 0.15; y < box.height * 0.65; y += 8) {
      for (let x = box.width * 0.4; x < box.width * 0.7; x += 8) {
        element.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerType: 'mouse',
            pointerId: 1,
            clientX: box.x + x,
            clientY: box.y + y,
          }),
        );
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (
          /Static match|Unresolved/.test(
            document.querySelector('[role="tooltip"]')?.textContent ?? '',
          )
        )
          return { x, y };
      }
    }
    return null;
  });
  expect(hit).not.toBeNull();
  await canvas.click({ position: hit! });
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.locator('.breadcrumbs')).toContainText('.py');
});
