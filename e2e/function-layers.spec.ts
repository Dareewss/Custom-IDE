import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

type Layer = {
  id: string;
  name: string;
  parentId: string;
  position: [number, number, number];
  header: [number, number, number];
};
const source = `def alpha(value):
    numbers = [1, 2]
    def inner():
        return value
    return inner()

def beta():
    result = [4, 5]
    return result[0]

print(alpha(1) + beta())
`;
async function layers(page: Page): Promise<Layer[]> {
  return JSON.parse(
    (await page.locator('.code-canvas canvas').getAttribute('data-function-layers')) ?? '[]',
  );
}
async function hitPoint(page: Page, name: string) {
  const canvas = page.locator('.code-canvas canvas');
  await expect
    .poll(async () => {
      const layer = (await layers(page)).find((layer) => layer.name === name)!;
      const hit = JSON.parse((await canvas.getAttribute('data-selected-function-hit')) ?? 'null');
      const box = await canvas.boundingBox();
      return (
        !!box &&
        Math.abs(box.width - hit?.viewport?.[0]) < 1 &&
        Math.abs(box.height - hit?.viewport?.[1]) < 1 &&
        hit?.name === name &&
        layer.header.every((axis, index) => Math.abs(axis - hit.world[index]) < 1e-4)
      );
    })
    .toBe(true);
  const hit = JSON.parse((await canvas.getAttribute('data-selected-function-hit'))!);
  const box = (await canvas.boundingBox())!;
  const point = { x: hit.ndc[0], y: hit.ndc[1] };
  return {
    x: box.x + ((point.x + 1) * box.width) / 2,
    y: box.y + ((1 - point.y) * box.height) / 2,
  };
}

test('separates function layers on Z, drags their actual geometry, persists offsets and shares them with the pop-out', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const zip = new JSZip();
  zip.file('main.py', source);
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Spatial.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-function-tethers', '3');
  await expect(canvas).toHaveAttribute('data-function-guides-dashed', 'true');
  const initial = await layers(page);
  const alpha = initial.find((layer) => layer.name === 'alpha')!,
    beta = initial.find((layer) => layer.name === 'beta')!,
    inner = initial.find((layer) => layer.name === 'inner')!;
  expect(alpha.header[1]).toBe(beta.header[1]);
  expect(beta.position[2]).toBeGreaterThan(inner.position[2]);
  expect(inner.position[2]).toBeGreaterThan(alpha.position[2]);
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await page.getByRole('treeitem', { name: 'function beta', exact: true }).click();
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await expect(canvas).toHaveAttribute('data-camera-position', /\[/);
  await page.getByRole('button', { name: '3D', exact: true }).hover();
  let point = await hitPoint(page, 'beta');
  await page.mouse.move(point.x, point.y);
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-hovered-node',
    beta.id,
  );
  const cameraBefore = await canvas.getAttribute('data-camera-position');
  await page.mouse.down();
  await page.mouse.move(point.x + 55, point.y + 18, { steps: 8 });
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-moving-node',
    beta.id,
  );
  await page.mouse.up();
  const x = page.getByRole('spinbutton', { name: 'Function X offset', exact: true });
  await expect.poll(async () => Math.abs(Number(await x.inputValue()))).toBeGreaterThan(0.1);
  await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await canvas.getAttribute('data-camera-position')).toBe(cameraBefore);
  const moved = (await layers(page)).find((layer) => layer.name === 'beta')!;
  expect(moved.position[0]).not.toBe(beta.position[0]);
  const z = page.getByRole('spinbutton', { name: 'Function Z offset', exact: true });
  const zBefore = Number(await z.inputValue()),
    xBefore = Number(await x.inputValue());
  await page.getByRole('button', { name: '3D', exact: true }).hover();
  point = await hitPoint(page, 'beta');
  await page.mouse.move(point.x, point.y);
  await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
    'data-hovered-node',
    beta.id,
  );
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(point.x, point.y - 35, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(async () => Number(await z.inputValue())).toBeGreaterThan(zBefore + 0.1);
  expect(Number(await x.inputValue())).toBe(xBefore);
  await page.getByRole('button', { name: 'Reset function position', exact: true }).click();
  await expect(x).toHaveValue('0');
  await expect(z).toHaveValue('0');
  await x.fill('3.5');
  await z.fill('2');
  const popupEvent = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Pop out 3D view', exact: true }).click();
  const popup = await popupEvent;
  await expect(
    popup.getByRole('spinbutton', { name: 'Function X offset', exact: true }),
  ).toHaveValue('3.5');
  await popup.getByRole('spinbutton', { name: 'Function Z offset', exact: true }).fill('4');
  await popup.getByRole('button', { name: 'Dock 3D view', exact: true }).click();
  await expect(z).toHaveValue('4');
  await page.reload();
  await expect(canvas).toHaveAttribute('data-function-tethers', '3');
  const search = page.getByRole('combobox', { name: 'Search 3D objects', exact: true });
  await search.fill('beta');
  await search.press('Enter');
  await expect(x).toHaveValue('3.5');
  await expect(z).toHaveValue('4');
  await page.getByRole('button', { name: 'Re-layout graph', exact: true }).click();
  await expect(x).toHaveValue('0');
  await expect(z).toHaveValue('0');
  await expect(canvas).toHaveAttribute('data-function-tethers', '3');
  await page.screenshot({ path: 'docs/screenshots/phase2/function-layers.png' });
  expect(errors).toEqual([]);
});
