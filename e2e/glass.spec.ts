import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { mkdir } from 'node:fs/promises';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
}
async function closeSettings(page: Page) {
  await page.getByRole('button', { name: 'Done', exact: true }).click();
}
async function transparency(page: Page, amount: number) {
  const slider = page.getByRole('slider', { name: 'Background transparency', exact: true });
  await slider.fill(String(amount));
  await expect(slider).toHaveValue(String(amount));
}
async function fixture(page: Page) {
  page.setDefaultTimeout(10000);
  await page.goto('/');
  const zip = new JSZip();
  zip.file(
    'main.py',
    '# A small experiment, a clear workspace.\nfrom statistics import mean\n\ndef summarize(values):\n    total = sum(values)\n    average = mean(values)\n    return {"total": total, "average": average}\n\nvalues = [12, 28, 34, 51, 75]\nresult = summarize(values)\nprint("Code Atlas · ready to explore")\nprint(f"Total: {result[\'total\']}")\nprint(f"Average: {result[\'average\']:.1f}")\n',
  );
  zip.file('experiments/__init__.py', '');
  zip.file(
    'experiments/search.py',
    'def locate(items, target):\n    return next((i for i, item in enumerate(items) if item == target), -1)\n',
  );
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Glass studio.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await page.locator('.monaco-editor').waitFor();
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 30000 });
  await expect(page.getByRole('log')).toContainText('Total: 200');
}

test('captures both themes, every preset, slider endpoints and midpoint with blobs on/off', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fixture(page);
  await mkdir('docs/screenshots/glass', { recursive: true });
  for (const theme of ['dark', 'light']) {
    for (const preset of ['neon', 'ocean', 'nebula']) {
      for (const blobs of [true, false]) {
        for (const value of [0, 50, 100]) {
          await openSettings(page);
          await page.getByLabel('Color theme').selectOption(theme);
          await page.getByLabel('Background preset').selectOption(preset);
          await page.getByRole('checkbox', { name: /^Background blobs/ }).setChecked(blobs);
          await transparency(page, value);
          await closeSettings(page);
          await expect(page.locator('html')).toHaveAttribute('data-preset', preset);
          await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', /blur\(24px\)/);
          await expect(page.locator('.monaco-editor')).toHaveCSS(
            'background-color',
            'rgba(0, 0, 0, 0)',
          );
          await expect(page.locator('.view-lines')).toHaveCSS('opacity', '1');
          await page.screenshot({
            path: `docs/screenshots/glass/${theme}-${preset}-${value}-${blobs ? 'blobs' : 'plain'}.png`,
            animations: 'disabled',
          });
        }
      }
    }
  }
});

test('persists glass settings and keeps blur only on independent surfaces', async ({ page }) => {
  await fixture(page);
  await openSettings(page);
  await page.getByLabel('Color theme').selectOption('light');
  await page.getByLabel('Background preset').selectOption('ocean');
  await page.getByRole('slider', { name: 'Blur strength', exact: true }).fill('36');
  await page.getByRole('checkbox', { name: /^Background animation/ }).uncheck();
  await transparency(page, 75);
  await closeSettings(page);
  await page.reload();
  await page.locator('.monaco-editor').waitFor();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-preset', 'ocean');
  await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', /blur\(36px\)/);
  await expect(page.locator('.scene-shape-1')).toHaveCSS('animation-play-state', 'paused');
  const nested = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('*')]
      .filter((el) => {
        if (getComputedStyle(el).backdropFilter === 'none') return false;
        for (let parent = el.parentElement; parent; parent = parent.parentElement)
          if (getComputedStyle(parent).backdropFilter !== 'none') return true;
        return false;
      })
      .map((el) => el.className),
  );
  expect(nested).toEqual([]);
  await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((el) => el.parentElement === document.body)).toBe(true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command palette', exact: true })).toBeVisible();
  await expect(page.locator('.command-dialog')).toHaveCSS('backdrop-filter', /blur/);
});

test('performance mode and system accessibility preferences disable expensive effects', async ({
  page,
}) => {
  await fixture(page);
  await openSettings(page);
  await page.getByRole('checkbox', { name: /^Performance mode/ }).check();
  await closeSettings(page);
  await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.scene-shape-1')).toHaveCSS('animation-name', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-performance', 'true');
  await openSettings(page);
  await page.getByRole('checkbox', { name: /^Performance mode/ }).uncheck();
  await closeSettings(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.scene-shape-1')).toHaveCSS('animation-name', 'none');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.scene-shape-1')).toHaveCSS('display', 'none');
  await expect(page.locator('.editor-card')).toHaveCSS('background-color', 'rgb(26, 33, 28)');
});

test('pauses scene animation when the page becomes hidden', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene')).toHaveAttribute('data-paused', 'false');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.scene')).toHaveAttribute('data-paused', 'true');
  await expect(page.locator('.scene-shape-1')).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.scene')).toHaveAttribute('data-paused', 'false');
});

test('actually blurs background pixels at every slider value while retaining alpha', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'glass-pixel-fixture';
    fixture.style.cssText =
      'position:fixed;left:600px;top:300px;width:240px;height:160px;z-index:200;background:repeating-linear-gradient(90deg,#ff0000 0 4px,#0000ff 4px 8px)';
    const pane = document.createElement('div');
    pane.className = 'glass';
    pane.style.cssText = 'width:100%;height:100%';
    fixture.append(pane);
    document.body.append(fixture);
  });
  const pixel = async () => {
    const png = await page.locator('#glass-pixel-fixture').screenshot();
    return page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 160;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return [...context.getImageData(120, 80, 1, 1).data];
    }, png.toString('base64'));
  };
  const results = [];
  for (const value of [0, 50, 100]) {
    await openSettings(page);
    await transparency(page, value);
    await closeSettings(page);
    const blurred = await pixel();
    // A genuine blur mixes both saturated stripes. Flat tint keeps one channel dominant.
    expect(Math.abs(blurred[0] - blurred[2])).toBeLessThan(12);
    await page.locator('#glass-pixel-fixture > .glass').evaluate((el: HTMLElement) => {
      el.style.backdropFilter = 'none';
    });
    const sharp = await pixel();
    expect(Math.abs(sharp[0] - sharp[2])).toBeGreaterThan(25);
    await page.locator('#glass-pixel-fixture > .glass').evaluate((el: HTMLElement) => {
      el.style.removeProperty('backdrop-filter');
    });
    results.push(blurred[0]);
  }
  expect(new Set(results).size).toBe(3);
});

test('keeps frosted blur at full transparency without decorative facet lines', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-facets')).toHaveCount(0);
  const editorCard = page.locator('.editor-card');
  await expect(editorCard).toHaveCSS('backdrop-filter', /blur\(24px\)/);

  await openSettings(page);
  await transparency(page, 100);
  await closeSettings(page);

  await expect(page.locator('html')).toHaveCSS('--workspace-opacity', '0');
  await expect(editorCard).toHaveCSS('backdrop-filter', /blur\(24px\)/);
});
