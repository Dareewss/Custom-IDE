import { chromium, expect } from '@playwright/test';
import JSZip from 'jszip';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  });
  await page.goto(process.env.ATLAS_PREVIEW_URL || 'http://127.0.0.1:4173');
  // App-owned neutral backdrop for readable transparent-window screenshots.
  // This fixture never captures or accesses the user's desktop.
  await page.addStyleTag({ content: 'body { background: #202522; }' });
  const zip = new JSZip();
  zip.file(
    'main.py',
    'from algorithms.search import binary_search\n\nnumbers = [2, 5, 8, 12, 16, 23, 38, 56]\ntarget = 23\nresult = binary_search(numbers, target)\nprint(f"Found {target} at index {result}")\n',
  );
  zip.file('algorithms/__init__.py', '');
  zip.file(
    'algorithms/search.py',
    'def binary_search(numbers, target):\n    """Find a value in a sorted list, one decision at a time."""\n    low, high = 0, len(numbers) - 1\n\n    while low <= high:\n        middle = (low + high) // 2\n        value = numbers[middle]\n        print(f"Searching {low}..{high} · checking {value}")\n\n        if value == target:\n            return middle\n        if value < target:\n            low = middle + 1\n        else:\n            high = middle - 1\n\n    return -1\n',
  );
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Binary search lab.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Binary search lab');
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await page.getByRole('slider', { name: 'Background transparency', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  const folder = page.getByRole('treeitem', { name: 'algorithms', exact: true });
  if ((await folder.getAttribute('aria-expanded')) === 'false') await folder.click();
  await page.getByRole('treeitem', { name: 'search.py', exact: true }).click();
  await page.getByRole('textbox', { name: 'Editor content' }).focus();
  await page.keyboard.press('Control+Home');
  await expect(page.locator('.statusbar')).toContainText('Saved');
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/workspace.png' });
  for (let i = 1; i < 7; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('F9');
  await page.getByRole('tab', { name: 'main.py', exact: true }).click();
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Paused');
  await page
    .getByRole('tabpanel', { name: 'Variables' })
    .getByText('numbers', { exact: true })
    .click();
  await page.screenshot({ path: 'docs/screenshots/debugger.png' });
  await page.getByRole('button', { name: 'Stop (Shift+F5)', exact: true }).click();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const transparency = page.getByRole('slider', { name: 'Background transparency', exact: true });
  await transparency.fill('0');
  for (let i = 0; i < 50; i++) await transparency.press('ArrowRight');
  await page.locator('.settings-scroll').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: 'docs/screenshots/settings.png' });
  await transparency.fill('100');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.addStyleTag({ content: 'body { background: #202522; }' });
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/compact.png' });
  console.log(
    'Captured workspace, debugger, transparency settings and compact screenshots from real execution.',
  );
} finally {
  await browser.close();
}
