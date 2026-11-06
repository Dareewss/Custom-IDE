import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('runs the multi-file 3D Tour and explores its real source structure', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New project', exact: true });
  await form.getByLabel('Project name', { exact: true }).fill('3D Tour');
  await form.getByRole('combobox').selectOption('3d-tour');
  await form.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('.workspace-title')).toContainText('3D Tour');
  const panel = page.getByRole('region', { name: 'Code overview', exact: true });
  const canvas = page.locator('.code-canvas canvas');
  await expect
    .poll(async () => Number(await panel.getAttribute('data-model-nodes')))
    .toBeGreaterThan(40);
  await expect(panel).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 60000 });
  await expect(page.getByRole('log')).toContainText('Accepted: [3, 4, 5, 6]');
  await expect(page.getByRole('log')).toContainText('Total: 18');
  await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/);
  await expect(canvas).toHaveAttribute('data-label-materials-opaque', 'true');
  await page.addStyleTag({ content: 'body { background: #202522; }' });
  await mkdir('docs/screenshots/phase2', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/phase2/tour-split.png' });
  const search = page.getByRole('combobox', { name: 'Search 3D objects', exact: true });
  await page.getByLabel('Object kind filter', { exact: true }).selectOption('function');
  await search.fill('summarize');
  await search.press('Enter');
  await expect(page.locator('.breadcrumbs')).toContainText('analysis.py');
  await expect(page.locator('.statusbar')).toContainText('Ln 1, Col 1');
  await expect(page.getByRole('tooltip').locator('strong')).toHaveText('summarize');
  const info = await page.getByRole('tooltip').boundingBox();
  const map = await page
    .getByRole('button', {
      name: '3D minimap',
      exact: true,
    })
    .boundingBox();
  if (info && map) expect(info.y + info.height).toBeLessThanOrEqual(map.y);
  await page.getByRole('button', { name: 'Isolate selected structure', exact: true }).click();
  await expect(panel).toHaveAttribute('data-isolated', 'true');
  await page.getByRole('button', { name: 'Exit isolate', exact: true }).click();
  await expect(panel).toHaveAttribute('data-isolated', 'false');
  await page.getByLabel('3D detail level', { exact: true }).selectOption('files');
  await expect
    .poll(async () => Number(await panel.getAttribute('data-visible-nodes')))
    .toBeLessThan(20);
  await page.getByLabel('3D detail level', { exact: true }).selectOption('all');
  await expect(panel).toHaveAttribute('aria-busy', 'false');
  await expect
    .poll(async () => Number(await panel.getAttribute('data-visible-nodes')))
    .toBeGreaterThan(40);
  await search.press('Escape');
  await page.getByLabel('Object kind filter', { exact: true }).selectOption('all');
  const layouts = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await layouts.getByRole('button', { name: '3D', exact: true }).click();
  await page.getByRole('button', { name: 'Fit all objects (Home)', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await page.getByRole('button', { name: 'Workbench', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'docs/screenshots/phase2/tour-overview.png' });
  await layouts.getByRole('button', { name: 'Split', exact: true }).click();
  const editor = await page.locator('.editor-card').boundingBox();
  const run = await page.getByRole('button', { name: 'Run file', exact: true }).boundingBox();
  if (editor && run) {
    expect(run.x).toBeGreaterThanOrEqual(editor.x);
    expect(run.x + run.width).toBeLessThanOrEqual(editor.x + editor.width);
  }
  expect(errors).toEqual([]);
});
