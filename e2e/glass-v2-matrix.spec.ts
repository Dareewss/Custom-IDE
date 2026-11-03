import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import JSZip from 'jszip';

test.use({ reducedMotion: 'no-preference' });
test('captures the complete five-layer appearance matrix with real code and output', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.clock.install();
  await page.goto('/');
  const zip = new JSZip();
  zip.file(
    'main.py',
    '# A living workspace, a quiet place to build.\nfrom statistics import mean\n\nvalues = [12, 28, 34, 51, 75]\nprint("Code Atlas · ready to explore")\nprint(f"Average: {mean(values):.1f}")\n',
  );
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Glass studio.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 30000 });
  await mkdir('docs/screenshots/layers-v2', { recursive: true });
  for (const theme of ['dark', 'light'])
    for (const orbs of [true, false])
      for (const animation of [true, false])
        for (const transparency of [0, 50, 100]) {
          await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
          await page.getByLabel('Color theme').selectOption(theme);
          await page.getByRole('checkbox', { name: /^Background blobs/ }).setChecked(orbs);
          await page.getByRole('checkbox', { name: /^Background animation/ }).setChecked(animation);
          await page
            .getByRole('slider', { name: 'Background transparency', exact: true })
            .fill(String(transparency));
          await page.getByRole('button', { name: 'Close settings', exact: true }).click();
          await page.clock.runFor(1200);
          await expect(page.locator('.scene')).toHaveAttribute(
            'data-motion',
            !orbs ? 'orbs-off' : animation ? 'running' : 'idle',
          );
          await expect(page.locator('.view-lines')).toHaveCSS('opacity', '1');
          await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', 'blur(4px)');
          await page.screenshot({
            path: `docs/screenshots/layers-v2/${theme}-${transparency}-${orbs ? 'orbs' : 'plain'}-${animation ? 'moving' : 'rest'}.png`,
            omitBackground: true,
          });
        }
});
