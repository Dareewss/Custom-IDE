import { test, expect, type Page } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });
const scene = (page: Page) => page.locator('.scene');
const frames = async (page: Page) => Number(await scene(page).getAttribute('data-orb-frames'));
const phase = async (page: Page) => Number(await scene(page).getAttribute('data-orb-phase'));
async function settings(page: Page) {
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
}
async function done(page: Page) {
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
}

test('moves smoothly at a capped rate, eases to exact home, and resumes the preserved phase', async ({
  page,
}) => {
  const epoch = Date.UTC(2026, 10, 3, 12);
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch + 1000);
  await page.goto('/');
  await expect(scene(page)).toHaveAttribute('data-motion', 'running');
  const first = await page.locator('.scene-shape-2').getAttribute('style');
  const before = await frames(page);
  await page.clock.runFor(1000);
  expect((await frames(page)) - before).toBeLessThanOrEqual(31);
  expect((await frames(page)) - before).toBeGreaterThan(10);
  expect(await page.locator('.scene-shape-2').getAttribute('style')).not.toBe(first);
  await page.clock.runFor(7000);
  await settings(page);
  await page.getByRole('checkbox', { name: /^Background animation/ }).uncheck();
  await done(page);
  await page.clock.runFor(700);
  await expect(scene(page)).toHaveAttribute('data-motion', 'idle');
  for (const orb of await page.locator('.scene-shape').all()) {
    await expect(orb).toHaveCSS('transform', 'none');
    await expect(orb).toHaveCSS('opacity', '0.95');
  }
  const stopped = { frames: await frames(page), phase: await phase(page) };
  await page.clock.runFor(2000);
  expect(await frames(page)).toBe(stopped.frames);
  expect(await phase(page)).toBe(stopped.phase);
  await settings(page);
  await page.getByRole('checkbox', { name: /^Background animation/ }).check();
  await done(page);
  await page.clock.runFor(500);
  expect(await phase(page)).toBeGreaterThan(stopped.phase);
  expect(await phase(page)).toBeLessThan(stopped.phase + 1.5);
});

test('stops while hidden or with orbs off and applies persisted animation speed', async ({
  page,
}) => {
  const epoch = Date.UTC(2026, 10, 3, 12);
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch + 1000);
  await page.goto('/');
  await expect(scene(page)).toHaveAttribute('data-motion', 'running');
  await page.clock.runFor(1000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene(page)).toHaveAttribute('data-motion', 'hidden');
  const hidden = { frames: await frames(page), phase: await phase(page) };
  await page.clock.runFor(3000);
  expect(await frames(page)).toBe(hidden.frames);
  expect(await phase(page)).toBe(hidden.phase);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene(page)).toHaveAttribute('data-motion', 'running');
  await settings(page);
  await page.getByRole('slider', { name: 'Animation speed', exact: true }).fill('2');
  await done(page);
  const fast = await phase(page);
  await page.clock.runFor(2000);
  expect((await phase(page)) - fast).toBeGreaterThan(3.5);
  expect((await phase(page)) - fast).toBeLessThan(4.5);
  await settings(page);
  await page.getByRole('checkbox', { name: /^Background blobs/ }).uncheck();
  await done(page);
  await expect(scene(page)).toHaveAttribute('data-motion', 'orbs-off');
  const off = await frames(page);
  await page.clock.runFor(2000);
  expect(await frames(page)).toBe(off);
  await page.reload();
  await settings(page);
  await expect(page.getByRole('slider', { name: 'Animation speed', exact: true })).toHaveValue('2');
});

for (const preset of ['neon', 'ocean', 'nebula']) {
  test(`keeps three ${preset} orbs on screen and stops its loop for reduced motion`, async ({
    page,
  }) => {
    const epoch = Date.UTC(2026, 10, 3, 12);
    await page.clock.install({ time: epoch });
    await page.clock.pauseAt(epoch + 1000);
    await page.goto('/');
    await expect(scene(page)).toHaveAttribute('data-motion', 'running');
    await settings(page);
    await page.getByLabel('Background preset').selectOption(preset);
    await done(page);
    await page.clock.runFor(30000);
    expect(
      await page.locator('.scene-shape').evaluateAll(
        (orbs) =>
          orbs.filter((orb) => {
            const r = orb.getBoundingClientRect();
            return (
              getComputedStyle(orb).display !== 'none' &&
              r.left < innerWidth &&
              r.right > 0 &&
              r.top < innerHeight &&
              r.bottom > 0
            );
          }).length,
      ),
    ).toBeGreaterThanOrEqual(3);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(scene(page)).toHaveAttribute('data-motion', 'reduced');
    const reduced = await frames(page);
    await page.clock.runFor(2000);
    expect(await frames(page)).toBe(reduced);
    await expect(page.locator('.scene-shape-2')).toHaveCSS('transform', 'none');
  });
}
