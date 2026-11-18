import { test, expect } from '@playwright/test';
for (const reducedMotion of ['no-preference', 'reduce'] as const)
  test(`navigates actual Flat and Layers cameras (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    const canvas = page.locator('.code-canvas canvas');
    await expect(canvas).toHaveAttribute('data-camera-position', /\[/);
    const nav = page.getByRole('group', { name: '3D navigation', exact: true });
    const target = await canvas.getAttribute('data-camera-target');
    await nav.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(canvas).not.toHaveAttribute('data-camera-target', target!);
    const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
    await page.keyboard.press('+');
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
      .toBeGreaterThan(zoom);
    const beforeFit = await canvas.getAttribute('data-camera-target');
    await page.getByRole('button', { name: 'Fit all objects (F)', exact: true }).click();
    await expect(canvas).not.toHaveAttribute('data-camera-target', beforeFit!);
    const fitted = await canvas.getAttribute('data-camera-target');
    await nav.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(canvas).not.toHaveAttribute('data-camera-target', fitted!);
    await page.getByRole('button', { name: 'Reset camera (R)', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-target', fitted!);
    await page.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
    await expect(canvas).toHaveAttribute('data-layer-progress', '1');
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
    const position = await canvas.getAttribute('data-camera-position');
    await nav.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(canvas).not.toHaveAttribute('data-camera-position', position!);
    await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
    await page.getByRole('treeitem', { name: 'file main.py', exact: true }).click();
    await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
    await page.getByRole('button', { name: 'Fit selected object (Shift+F)', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
    await page.waitForTimeout(700);
    const frames = await canvas.getAttribute('data-scene-frames');
    await page.waitForTimeout(450);
    expect(await canvas.getAttribute('data-scene-frames')).toBe(frames);
  });
