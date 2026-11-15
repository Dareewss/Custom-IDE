import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });
for (const motion of ['reduce', 'no-preference'] as const)
  test(`switches real projection/planes/gap and returns to demand idle (${motion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    const canvas = await importPlaneFixture(page, {
      'helper.py': 'def double(value):\n    return value * 2\n',
    });
    const mode = page.getByRole('combobox', { name: 'Structure view mode', exact: true });
    await expect(canvas).toHaveAttribute('data-camera-projection', 'orthographic');
    await mode.selectOption('layers');
    if (motion === 'no-preference')
      await expect(canvas).toHaveAttribute('data-camera-moving', 'true');
    await expect(canvas).toHaveAttribute('data-layer-progress', '1');
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
    await expect(canvas).toHaveAttribute('data-camera-projection', 'perspective');
    await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
    const getHits = async () => JSON.parse((await canvas.getAttribute('data-tile-hits'))!);
    for (const hit of await getHits()) expect(hit.position[1]).toBeCloseTo(-hit.level * 5);
    const gap = page.getByRole('slider', { name: 'Plane gap', exact: true });
    await gap.focus();
    for (let i = 0; i < 4; i++) await gap.press('ArrowRight');
    await expect
      .poll(async () =>
        (await getHits())
          .filter((hit: { level: number }) => hit.level > 0)
          .every(
            (hit: { position: number[]; level: number }) => hit.position[1] === -hit.level * 7,
          ),
      )
      .toBe(true);
    const hits = await getHits();
    expect(new Set(hits.map((hit: { lane: number }) => hit.lane)).size).toBe(2);
    const files = hits.filter((hit: { level: number }) => hit.level === 0);
    expect(files[0].position[2]).not.toBe(files[1].position[2]);
    const box = (await canvas.boundingBox())!,
      file = files.find(
        (hit: { x: number; y: number }) =>
          hit.x > 0 && hit.x < box.width && hit.y > 0 && hit.y < box.height,
      );
    expect(file).toBeTruthy();
    await page.mouse.move(box.x + file.x, box.y + file.y);
    await expect(page.getByRole('tooltip')).toContainText('file');
    await page.mouse.click(box.x + file.x, box.y + file.y);
    await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
      'data-selected-node',
      file.nodeIds[0],
    );
    await page.waitForTimeout(600);
    const frames = await canvas.getAttribute('data-scene-frames');
    await page.waitForTimeout(500);
    expect(await canvas.getAttribute('data-scene-frames')).toBe(frames);
    const opened = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
    const popup = await opened;
    await expect(popup.locator('.code-canvas canvas')).toHaveAttribute(
      'data-camera-projection',
      'perspective',
    );
    await expect(popup.getByRole('slider', { name: 'Plane gap', exact: true })).toHaveValue('7');
    await popup.close();
    await mode.selectOption('flat');
    await expect(canvas).toHaveAttribute('data-layer-progress', '0');
    await expect(canvas).toHaveAttribute('data-camera-projection', 'orthographic');
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  });
