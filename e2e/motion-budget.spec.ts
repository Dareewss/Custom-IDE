import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });
test('drops to 15fps, pauses with a notice, and resumes without losing phase', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const scene = page.locator('.scene');
  await expect(scene).toHaveAttribute('data-motion', 'running');
  // Simulate a consistently slow display clock, independently from the 30fps paint throttle.
  await page.evaluate(() => {
    const original = window.requestAnimationFrame.bind(window);
    let offset = 0;
    Object.assign(window, {
      restoreFrameClock: () => {
        window.requestAnimationFrame = original;
      },
    });
    window.requestAnimationFrame = (callback) =>
      original((time) => {
        offset += 13;
        callback(time + offset);
      });
  });
  await page.clock.runFor(550);
  await expect(scene).toHaveAttribute('data-orb-fps', '15');
  await page.clock.runFor(600);
  await expect(scene).toHaveAttribute('data-motion', 'budget-paused');
  await expect(page.getByRole('note')).toContainText('keep the editor responsive');
  await expect(
    page.getByRole('button', { name: 'Toggle orb animation', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  const phase = Number(await scene.getAttribute('data-orb-phase'));
  const frames = await scene.getAttribute('data-orb-frames');
  await page.clock.runFor(2000);
  expect(await scene.getAttribute('data-orb-frames')).toBe(frames);
  await page.evaluate(() => {
    (window as unknown as { restoreFrameClock: () => void }).restoreFrameClock();
  });
  await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
  await page.clock.runFor(500);
  await expect(scene).toHaveAttribute('data-motion', 'running');
  await expect(scene).toHaveAttribute('data-orb-fps', '30');
  await expect(page.getByRole('note')).toHaveCount(0);
  expect(Number(await scene.getAttribute('data-orb-phase'))).toBeGreaterThan(phase);
});

test('reduced transparency stops motion and native material calls ignore slider changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      materialCalls: 0,
      codeAtlasDesktop: {
        supportsDesktopBlur: true,
        setTheme: () => {},
        onCloseRequested: () => () => {},
        ready: () => {},
        close: () => {},
        minimize: () => {},
        toggleExpand: () => {},
        resize: () => {},
        setDesktopBlur: async () => {
          (window as unknown as { materialCalls: number }).materialCalls++;
          return true;
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const calls = () =>
    page.evaluate(() => (window as unknown as { materialCalls: number }).materialCalls);
  const before = await calls();
  for (const value of [0, 50, 100])
    await page
      .getByRole('slider', { name: 'Background transparency', exact: true })
      .fill(String(value));
  await page.getByLabel('Background preset').selectOption('ocean');
  expect(await calls()).toBe(before);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await expect(page.locator('.scene')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.editor-card')).toHaveCSS(
    'background-color',
    'rgba(18, 18, 22, 0.98)',
  );
  await expect.poll(calls).toBe(before + 1);
});
