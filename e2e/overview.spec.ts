import { test, expect } from '@playwright/test';

test('shows transparent real 3D in Split, keeps outline accessible and stops rendering at rest', async ({
  page,
}) => {
  await page.goto('/');
  const overview = page.getByRole('region', { name: 'Code overview', exact: true });
  await expect(overview).toHaveAttribute('aria-busy', 'false');
  await expect(overview).not.toHaveAttribute('data-model-nodes', '0');
  const canvas = overview.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-render-frames', /[1-9]/);
  await expect(page.locator('.editor-card')).toBeVisible();
  await expect(page.locator('.output-card')).toBeVisible();
  await expect(overview.locator('.code-canvas')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const context = await canvas.evaluate((element) => {
    const gl = element.getContext('webgl2')!;
    return gl.getContextAttributes();
  });
  expect(context?.alpha).toBe(true);
  expect(context?.premultipliedAlpha).toBe(true);
  await page.waitForTimeout(700);
  const frames = await canvas.getAttribute('data-render-frames');
  await page.waitForTimeout(500);
  expect(await canvas.getAttribute('data-render-frames')).toBe(frames);
  const isolate = await page.addStyleTag({
    content:
      '.workspace *{visibility:hidden!important}.code-canvas,.code-canvas canvas{visibility:visible!important}.background-pane,.orb-plane{visibility:hidden!important}html,body,#root,.layer-stack,.workspace,.glass{background:transparent!important;backdrop-filter:none!important;border-color:transparent!important;box-shadow:none!important}',
  });
  const png = await page.locator('.code-canvas canvas').screenshot({
    omitBackground: true,
    path: 'docs/screenshots/phase2/foundation-canvas.png',
  });
  const pixels = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const sampled = document.createElement('canvas');
    sampled.width = image.width;
    sampled.height = image.height;
    const context = sampled.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, image.width, image.height).data;
    let painted = 0;
    let clear = 0;
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i]) painted++;
      else clear++;
    }
    return { painted, clear };
  }, png.toString('base64'));
  expect(pixels.painted).toBeGreaterThan(20);
  expect(pixels.clear).toBeGreaterThan(20);
  await isolate.evaluate((style) => style.remove());
  await overview.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const outline = page.getByRole('tree', { name: 'Code outline', exact: true });
  await expect(outline.getByRole('treeitem', { name: 'file main.py', exact: true })).toBeVisible();
  await outline.getByRole('treeitem', { name: 'file main.py', exact: true }).focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(outline.getByRole('treeitem').last()).toHaveAttribute('aria-selected', 'true');
  const modes = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await modes.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(overview).toHaveCount(0);
  await modes.getByRole('button', { name: '3D', exact: true }).click();
  await expect(overview).toBeVisible();
  await expect(page.locator('.editor-card')).toHaveCount(0);
  await modes.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(overview).toHaveCount(0);
  await expect(page.locator('.editor-card')).toBeVisible();
});

test('falls back to actual project outline when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
        return Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('tree', { name: 'Code outline', exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: 'file main.py', exact: true })).toBeVisible();
  await expect(page.getByText('3D is unavailable here. Explore the code outline.')).toBeVisible();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace settings', exact: true })).toBeVisible();
});
