import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1422, height: 1000 }, reducedMotion: 'reduce' });

for (const preset of ['neon', 'ocean', 'nebula']) {
  test(`${preset} orbs retain the established resting composition`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
    await page.getByLabel('Background preset').selectOption(preset);
    await page.getByRole('checkbox', { name: /^Background animation/ }).uncheck();
    await page.getByRole('slider', { name: 'Background transparency', exact: true }).fill('88');
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    const homes = await page.locator('.scene-shape').evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          visible:
            style.display !== 'none' &&
            rect.right > 0 &&
            rect.left < innerWidth &&
            rect.bottom > 0 &&
            rect.top < innerHeight,
          opacity: Number(style.opacity),
          gradient: style.backgroundImage,
        };
      }),
    );
    expect(homes.filter((home) => home.visible).length).toBeGreaterThanOrEqual(3);
    for (const home of homes.filter((home) => home.visible)) {
      expect(home.opacity).toBe(0.95);
      expect(home.gradient).toContain('radial-gradient');
    }
    await page.addStyleTag({
      content: `
      .workspace, .background-pane { visibility: hidden !important; }
      .scene, html, body, #root { background: transparent !important; }
    `,
    });
    await expect(page).toHaveScreenshot(`${preset}-orbs.png`, {
      omitBackground: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.001,
    });
  });
}

test('keeps backing, orbs and unfiltered foreground in one layer root', async ({ page }) => {
  await page.goto('/?glassLayers=none');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).waitFor();
  await expect(page.locator('html')).toHaveAttribute('data-layer-orbs', 'true');
  await expect(page.locator('.orb-plane')).toHaveCSS('z-index', '10');
  await expect(page.locator('.editor-card')).toHaveCSS('z-index', '20');
  await expect(page.locator('.workspace')).toHaveCSS('isolation', 'auto');
  expect(
    await page.evaluate(() => {
      const panes = [...document.querySelectorAll('.workspace .glass')];
      const violations: string[] = [];
      for (const pane of panes)
        for (let parent = pane.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (
            style.filter !== 'none' ||
            Number(style.opacity) < 1 ||
            style.backdropFilter !== 'none' ||
            style.maskImage !== 'none' ||
            style.clipPath !== 'none' ||
            style.mixBlendMode !== 'normal' ||
            /filter|opacity/.test(style.willChange)
          )
            violations.push(parent.className);
        }
      const backing = document.querySelector('.background-pane')!;
      const orbs = document.querySelector('.orb-plane')!;
      const shell = document.querySelector('.workspace')!;
      if (
        backing.parentElement !== orbs.parentElement ||
        orbs.parentElement !== shell.parentElement
      )
        violations.push('Layer roots are not siblings');
      return violations;
    }),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCSS('position', 'fixed');
  const box = await page.getByRole('menu').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(1000);
});
