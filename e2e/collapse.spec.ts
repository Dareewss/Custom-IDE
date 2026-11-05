import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('collapses by keyboard, persists per-project detail and reveals source-selected descendants', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file('main.py', await readFile('tests/fixtures/python/shapes.py', 'utf8'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Collapse.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Collapse');
  const panel = page.getByRole('region', { name: 'Code overview', exact: true });
  await expect(panel).toHaveAttribute('data-visible-nodes', '9');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const counter = page.getByRole('treeitem', { name: 'class Counter', exact: true });
  await page.getByRole('treeitem', { name: 'variable total', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse class Counter', exact: true }).click();
  await expect(panel).toHaveAttribute('data-visible-nodes', '4');
  await expect(counter).toHaveAttribute('aria-selected', 'true');
  await expect(counter).toHaveAttribute('aria-expanded', 'false');
  await counter.focus();
  await page.keyboard.press('ArrowRight');
  await expect(panel).toHaveAttribute('data-visible-nodes', '9');
  await page.keyboard.press('ArrowLeft');
  await expect(panel).toHaveAttribute('data-visible-nodes', '4');
  await page.reload();
  await expect(panel).toHaveAttribute('data-visible-nodes', '4');
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  await expect(counter).toHaveAttribute('aria-expanded', 'false');
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  await editor.focus();
  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await expect(panel).toHaveAttribute('data-visible-nodes', '9');
  await expect(page.getByRole('treeitem', { name: 'method add', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await counter.click();
  await page.getByRole('button', { name: 'Show code outline', exact: true }).click();
  const navigation = page.getByRole('group', { name: '3D navigation', exact: true });
  await expect(page.locator('.code-canvas canvas')).toHaveAttribute('data-labels-ready', '4');
  await navigation.focus();
  await page.keyboard.press('c');
  await expect(panel).toHaveAttribute('data-visible-nodes', '4');
  await expect(navigation).toBeFocused();
  await page.keyboard.press('c');
  await expect(panel).toHaveAttribute('data-visible-nodes', '9');
  await page.getByLabel('3D detail level', { exact: true }).selectOption('files');
  await expect(panel).toHaveAttribute('data-visible-nodes', '1');
  await page.getByLabel('3D detail level', { exact: true }).selectOption('classes');
  await expect(panel).toHaveAttribute('data-visible-nodes', '2');
  await page.getByLabel('3D detail level', { exact: true }).selectOption('functions');
  await expect(panel).toHaveAttribute('data-visible-nodes', '4');
  await page.reload();
  await expect(page.getByLabel('3D detail level', { exact: true })).toHaveValue('functions');
  await expect(panel).toHaveAttribute('data-visible-nodes', '4');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Unfolded.zip',
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText('Unfolded');
  await expect(page.getByLabel('3D detail level', { exact: true })).toHaveValue('all');
  await expect(panel).toHaveAttribute('data-visible-nodes', '9');
});
