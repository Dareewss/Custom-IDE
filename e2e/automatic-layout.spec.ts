import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
for (const reducedMotion of ['no-preference', 'reduce'] as const)
  test(`keeps unchanged source tiles stable after an edit (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const canvas = await importPlaneFixture(page);
    const panel = page.getByRole('region', { name: 'Code overview', exact: true });
    const before = JSON.parse((await canvas.getAttribute('data-tile-hits'))!);
    const revision = Number(await panel.getAttribute('data-model-revision'));
    const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
    await editor.focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.insertText('\n# unchanged structure\n');
    await expect
      .poll(async () => Number(await panel.getAttribute('data-model-revision')))
      .toBeGreaterThan(revision);
    const after = JSON.parse((await canvas.getAttribute('data-tile-hits'))!);
    for (const tile of before.filter((item: { level: number }) => item.level > 0)) {
      const same = after.find((item: { id: string }) => item.id === tile.id);
      expect(same?.position).toEqual(tile.position);
    }
    await expect(page.getByRole('button', { name: 'Re-layout graph', exact: true })).toHaveCount(0);
    await page.waitForTimeout(700);
    const frames = await canvas.getAttribute('data-scene-frames');
    await page.waitForTimeout(450);
    expect(await canvas.getAttribute('data-scene-frames')).toBe(frames);
  });
