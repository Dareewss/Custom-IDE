import { test, expect } from '@playwright/test';

test('renders local SDF labels offline, opens source from a slab, and updates real file plates', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/'))
      external.push(request.url());
  });
  await page.goto('/');
  const modes = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await modes.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('.code-canvas canvas');
  await expect(canvas).toHaveAttribute('data-labels-ready', '1');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(canvas).toHaveAttribute('data-labels-ready', '1');
  await modes.getByRole('button', { name: '3D', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '1');
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const rect = element.closest('.code-canvas')!.getBoundingClientRect();
        return (
          element.getAttribute('data-camera-ready') ===
          `${Math.round(rect.width)}x${Math.round(rect.height)}`
        );
      }),
    )
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/phase2/file-slabs-before-click.png' });
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box!.width * 0.75, y: box!.height * 0.55 } });
  await expect(modes.getByRole('button', { name: 'Split', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('textbox', { name: 'Editor content' })).toBeFocused();
  await expect(page.locator('.breadcrumbs')).toContainText('main.py');
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'New file', exact: true });
  await create.getByLabel('Name', { exact: true }).fill('extra.py');
  await create.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '2');
  await page.getByRole('treeitem', { name: 'extra.py', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete…', exact: true }).click();
  const remove = page.getByRole('dialog', { name: 'Delete from project', exact: true });
  await remove.getByRole('textbox').fill('extra.py');
  await remove.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '1');
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await page.getByLabel('Color theme').selectOption('light');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-labels-ready', '1');
  await page.screenshot({ path: 'docs/screenshots/phase2/file-slabs-light.png' });
  expect(external).toEqual([]);
});

test.describe('Font failure', () => {
  test.use({ serviceWorkers: 'block' });
  test('uses the actual outline instead of hanging when the font asset is invalid', async ({
    page,
  }) => {
    await page.route('**/fonts/JetBrainsMono-Regular.ttf', (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'This is not a font.' }),
    );
    await page.goto('/');
    await expect(page.getByRole('tree', { name: 'Code outline', exact: true })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'file main.py', exact: true })).toBeVisible();
    await page.getByRole('treeitem', { name: 'file main.py', exact: true }).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await expect(page.locator('.breadcrumbs')).toContainText('main.py');
    await expect(page.locator('.view-lines')).toContainText('Hello, world!');
  });
});
