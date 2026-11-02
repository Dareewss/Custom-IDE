import { chromium, expect } from '@playwright/test';
import JSZip from 'jszip';
import { spawn } from 'node:child_process';
import { appendFile, mkdir } from 'node:fs/promises';

const origin = 'http://127.0.0.1:4175';
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4175',
    '--strictPort',
  ],
  { stdio: 'ignore' },
);
let browser;
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (
      await fetch(origin)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await new Promise((done) => setTimeout(done, 250));
  }
  browser = await chromium.launch({
    headless: true,
    channel:
      process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  });
  await page.goto(origin);
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  const zip = new JSZip();
  zip.file(
    'large.py',
    Array.from({ length: 10000 }, (_, i) => `value_${i} = ${i}  # large-file fixture`).join('\n'),
  );
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Performance fixture.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await page.locator('.monaco-editor').waitFor();
  const measurements = [];
  for (const mode of [false, true]) {
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    await page.getByRole('checkbox', { name: /Performance mode/ }).setChecked(mode);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', mode ? 'none' : /blur/);
    const editor = page.getByRole('textbox', { name: 'Editor content' });
    await editor.focus();
    await editor.press('Control+End');
    await editor.press('Enter');
    await page.keyboard.type('# ');
    await page.evaluate(() => {
      const data = { keys: [], frames: [] };
      window.__glassQa = data;
      window.__glassQaListener = () => {
        const start = performance.now();
        requestAnimationFrame(() => data.keys.push(performance.now() - start));
      };
      document.addEventListener('keydown', window.__glassQaListener);
    });
    const frames = page.evaluate(
      () =>
        new Promise((done) => {
          let last = performance.now();
          let count = 0;
          const frame = (now) => {
            window.__glassQa.frames.push(now - last);
            last = now;
            if (++count < 120) requestAnimationFrame(frame);
            else done();
          };
          requestAnimationFrame(frame);
        }),
    );
    await page.keyboard.type('abcdefghijklmnopqrstuvwxyz'.repeat(3), { delay: 8 });
    const box = await page.locator('.monaco-editor').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, -200);
    await frames;
    const result = await page.evaluate(() => {
      document.removeEventListener('keydown', window.__glassQaListener);
      const p95 = (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        return Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10;
      };
      return {
        keySamples: window.__glassQa.keys.length,
        keyToFrameP95Ms: p95(window.__glassQa.keys),
        frameP95Ms: p95(window.__glassQa.frames),
      };
    });
    expect(result.keySamples).toBeGreaterThanOrEqual(70);
    expect(result.keyToFrameP95Ms).toBeLessThan(250);
    expect(result.frameP95Ms).toBeLessThan(100);
    measurements.push({ performanceMode: mode, ...result });
  }
  await mkdir('docs', { recursive: true });
  await appendFile(
    'docs/QA.md',
    `\nGlass performance - isolated headless Chrome, 10,000-line Python fixture, 1440x960. Key-to-next-frame is a synthetic response proxy, not a physical input latency measurement.\n${JSON.stringify(measurements, null, 2)}\n`,
  );
  console.log(JSON.stringify(measurements, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
