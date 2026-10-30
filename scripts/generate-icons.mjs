import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined),
});
try {
  const svg = await readFile('public/icons/atlas.svg', 'utf8');
  await mkdir('public/icons', { recursive: true });
  const iconImages = [];
  for (const size of [32, 48, 180, 192, 256, 512]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:#101719}svg{display:block;width:100%;height:100%}</style>${svg}`,
    );
    const png = await page.screenshot(
      [180, 192, 512].includes(size) ? { path: `public/icons/atlas-${size}.png` } : {},
    );
    if ([32, 48, 256].includes(size)) iconImages.push({ size, png });
    await page.close();
  }
  const header = Buffer.alloc(6 + iconImages.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(iconImages.length, 4);
  let offset = header.length;
  iconImages.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(
    'public/icons/atlas.ico',
    Buffer.concat([header, ...iconImages.map(({ png }) => png)]),
  );
} finally {
  await browser.close();
}
