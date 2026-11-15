import { test, expect } from '@playwright/test';
import { importPlaneFixture } from './fixtures/plane-page';
test.use({ storageState: { cookies: [], origins: [] } });

test('shows source metrics, selects exact code, dims context and syncs the Monaco cursor', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const canvas = await importPlaneFixture(page);
  const panel = page.getByRole('region', { name: 'Code overview', exact: true });
  const getHit = async () =>
    JSON.parse((await canvas.getAttribute('data-tile-hits'))!).find(
      (hit: { nodeIds: string[]; level: number }) => hit.level === 2 && hit.nodeIds.length === 1,
    );
  const hit = await getHit(),
    box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + hit.x, box.y + hit.y);
  const info = page.getByRole('tooltip');
  await expect(info).toContainText('main.py:4:5');
  await expect(info).toContainText('2 lines');
  await expect(info).toContainText('% of parent');
  await expect(info).toContainText('callers');
  await expect(info).toContainText('No syntax diagnostics');
  await page.mouse.click(box.x + hit.x, box.y + hit.y);
  await expect(panel).toHaveAttribute('data-selected-node', hit.nodeIds[0]);
  await expect(page.locator('.statusbar')).toContainText('Ln 4, Col 5');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-dimmed-tiles')))
    .toBeGreaterThan(0);
  const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
  await editor.focus();
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(panel).not.toHaveAttribute('data-selected-node', hit.nodeIds[0]);
  await expect
    .poll(async () => await canvas.getAttribute('data-focused-tile'))
    .toBe(await panel.getAttribute('data-selected-node'));
});

test('double-click reroots to a tile, fills its width and Escape follows the breadcrumb', async ({
  page,
}) => {
  const canvas = await importPlaneFixture(page);
  const navigation = page.getByRole('group', { name: '3D navigation', exact: true });
  const before = Number(await canvas.getAttribute('data-tile-instances'));
  const hits = JSON.parse((await canvas.getAttribute('data-tile-hits'))!);
  const hit = hits.find(
    (hit: { level: number; nodeIds: string[] }) => hit.level === 2 && hit.nodeIds.length === 1,
  );
  const box = (await canvas.boundingBox())!;
  await page.mouse.dblclick(box.x + hit.x, box.y + hit.y);
  await expect(navigation).toHaveAttribute('data-scope', hit.nodeIds[0]);
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute('data-tile-label-bounds'))!).find(
          (label: { id: string; tile: number[] }) => label.id === hit.nodeIds[0],
        )?.tile[2] ?? 0,
    )
    .toBeGreaterThan(box.width * 0.6);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tile-instances')))
    .toBeLessThan(before);
  await expect(page.getByRole('navigation', { name: 'Structure breadcrumb' })).toContainText(
    '__init__',
  );
  await navigation.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Structure breadcrumb' })).toContainText(
    'Counter',
  );
  await page.keyboard.press('Escape');
  await expect(navigation).toHaveAttribute('data-scope', '');
  await expect(canvas).toHaveAttribute('data-tile-instances', String(before));
});
