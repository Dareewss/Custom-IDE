import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined),
});
try {
  const svg = await readFile('public/icons/atlas.svg', 'utf8');
  await mkdir('public/icons', { recursive: true });
  for (const size of [180, 192, 512]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:#101719}svg{display:block;width:100%;height:100%}</style>${svg}`,
    );
    await page.screenshot({ path: `public/icons/atlas-${size}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
