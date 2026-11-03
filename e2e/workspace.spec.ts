import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function importProject(page: Page, files: Record<string, string>, name = 'Test project') {
  const zip = new JSZip();
  for (const [path, text] of Object.entries(files)) zip.file(path, text);
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: `${name}.zip`,
    mimeType: 'application/zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.locator('.workspace-title')).toContainText(name);
  await page.locator('.monaco-editor').waitFor();
}
async function breakpoint(page: Page, line: number) {
  await page.getByRole('textbox', { name: 'Editor content' }).focus();
  await page.keyboard.press('Control+Home');
  for (let i = 1; i < line; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('F9');
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Manage projects', exact: true })).toBeVisible();
});

test('uses frosted surfaces and persists background-only transparency from 0 to 100', async ({
  page,
}) => {
  await importProject(page, { 'main.py': 'print("Text remains visible")\n' }, 'Transparency');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.workspace')).toHaveCSS('background-image', 'none');
  await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', /blur\(4px\)/);
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Background transparency', exact: true });
  await expect(page.getByRole('switch', { name: 'Liquid glass', exact: true })).toHaveCount(0);
  await expect(slider).toHaveValue('100');
  await slider.fill('0');
  const strongTint = await page
    .locator('.editor-card')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await expect(page.locator('.background-pane')).toHaveCSS(
    'background-color',
    'rgba(18, 18, 22, 0.96)',
  );
  await slider.press('End');
  await expect(slider).toHaveValue('100');
  expect(
    await page.locator('.editor-card').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(strongTint);
  await expect(page.locator('.editor-card')).toHaveCSS('backdrop-filter', /blur\(4px\)/);

  await expect(page.locator('.workspace')).toHaveCSS('opacity', '1');
  await expect(page.locator('.view-lines')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', { name: 'Run file', exact: true })).toHaveCSS(
    'opacity',
    '1',
  );
  await slider.press('Home');
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings (Ctrl+,)', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Background transparency', exact: true }),
  ).toHaveValue('1');
  await page.getByRole('slider', { name: 'Background transparency', exact: true }).press('Home');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0');
});

async function offlineReady(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
}
test('provides a valid standalone manifest, icons and installation guide', async ({ page }) => {
  await offlineReady(page);
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    '192x192',
    '512x512',
  ]);
  const cdp = await page.context().newCDPSession(page);
  const parsed = await cdp.send('Page.getAppManifest');
  expect(parsed.errors.filter((error) => error.critical)).toEqual([]);
  await page.getByRole('button', { name: 'Install app', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Install Code Atlas', exact: true })).toContainText(
    'Open in Chrome or Edge',
  );
  await expect(page.getByRole('dialog', { name: 'Install Code Atlas', exact: true })).toContainText(
    'Workspace available offline',
  );
  await page.getByRole('button', { name: 'Close installation guide', exact: true }).click();
});
test('restores projects and executes cached Python with the network offline', async ({
  page,
  context,
}) => {
  await offlineReady(page);
  await importProject(page, { 'main.py': 'print("Offline Python ready")\n' }, 'Offline workspace');
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0');
  await page.keyboard.press('Control+s');
  await expect(page.locator('.statusbar')).toContainText('Saved');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.app-connectivity')).toContainText('Offline');
  await expect(page.locator('.workspace-title')).toContainText('Offline workspace');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 20000 });
  await expect(page.getByRole('log')).toContainText('Offline Python ready');
});

test('switches Code, Split and Focus layouts and opens rail tools', async ({ page }) => {
  await importProject(page, { 'main.py': 'print("Workspace ready")\n' });
  const modes = page.getByRole('group', { name: 'Workspace layout', exact: true });
  await expect(modes.getByRole('button', { name: 'Split', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.output-card.docked')).toBeVisible();
  await modes.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(
    page.getByRole('separator', { name: 'Resize bottom panel', exact: true }),
  ).toBeVisible();
  await modes.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Output panel' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Search files', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Quick open file' })).toBeVisible();
  await page.keyboard.press('Escape');
  await modes.getByRole('button', { name: 'Split', exact: true }).click();
  await page.getByRole('tab', { name: 'Variables', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Variables' })).toBeVisible();
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Project manager' })).toBeVisible();
});

test('runs multi-file Python with stdin, both streams, diagnostics and source links', async ({
  page,
}) => {
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await importProject(page, {
    'main.py': 'from helper import greet\nname = input("Name? ")\ngreet(name)\n',
    'helper.py':
      'import sys\ndef greet(name):\n    print("Hello " + name)\n    print("Diagnostic stream", file=sys.stderr)\n    raise ValueError("Check this value")\n',
  });
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await page.getByRole('textbox', { name: 'Program input' }).fill('Darius');
  await page.getByRole('button', { name: 'Send input' }).click();
  await expect(page.getByRole('log')).toContainText('Hello Darius');
  await expect(page.getByRole('log')).toContainText('Diagnostic stream');
  await expect(page.getByRole('status')).toContainText('exit 1');
  await page.locator('.trace-link').filter({ hasText: 'helper.py' }).click();
  await expect(page.getByRole('tab', { name: 'helper.py', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Problems', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Problems' })).toContainText('ValueError');
});

test('persists breakpoints, inspects variables, steps and stops a paused worker', async ({
  page,
}) => {
  await importProject(page, {
    'main.py':
      'class Box:\n    def __init__(self):\n        self.items = [1, 2, {"answer": 42}]\n\ndef calculate(seed):\n    values = [seed, {"double": seed * 2}]\n    box = Box()\n    cycle = []\n    cycle.append(cycle)\n    total = seed + 1\n    return total\n\nresult = calculate(7)\nprint(result)\n',
  });
  await breakpoint(page, 10);
  await page.keyboard.press('Control+s');
  await expect(page.locator('.statusbar')).toContainText('Saved');
  await page.reload();
  await expect(page.locator('.breakpoint-glyph')).toHaveCount(1);
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Paused');
  const variables = page.getByRole('tabpanel', { name: 'Variables' });
  await variables.getByText('box', { exact: true }).click();
  await expect(variables.getByText('items', { exact: true })).toBeVisible();
  await variables.getByText('cycle', { exact: true }).click();
  await expect(variables).toContainText('circular reference');
  await page.getByRole('button', { name: 'Step Over (F10)', exact: true }).click();
  await expect(variables).toContainText('main.py:11');
  await expect(variables.getByText('total', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Call Stack', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Call Stack' })).toContainText('calculate');
  await page.getByRole('button', { name: 'Stop (Shift+F5)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Stopped');
});

test('stops infinite loops and restarts with fresh filesystem state', async ({ page }) => {
  await importProject(page, { 'main.py': 'while True:\n    pass\n' }, 'Infinite loop');
  await page.keyboard.press('F5');
  await expect(page.getByRole('status')).toContainText('Running');
  await page.keyboard.press('Shift+F5');
  await expect(page.getByRole('status')).toContainText('Stopped');
  await importProject(page, { 'main.py': 'print(42)\n' }, 'Fresh run');
  await page.getByRole('button', { name: 'Restart (Ctrl+Shift+F5)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0');
  await expect(page.getByRole('log')).toContainText('42');
  await importProject(
    page,
    { 'main.py': 'for i in range(10000):\n    print("x" * 200)\nwhile True:\n    pass\n' },
    'Output limit',
  );
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Running', { timeout: 20000 });
  await expect(page.getByRole('log')).toContainText('Output limited to 1,000,000 characters', {
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'Stop (Shift+F5)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Stopped');
});

test.describe('Without cross-origin isolation', () => {
  test.use({ serviceWorkers: 'block' });
  test('reports missing isolation headers for stdin and debugging while plain Python still runs', async ({
    page,
  }) => {
    await page.route('http://127.0.0.1:4173/', async (route) => {
      const response = await route.fetch();
      const headers = response.headers();
      delete headers['cross-origin-opener-policy'];
      delete headers['cross-origin-embedder-policy'];
      await route.fulfill({ response, headers });
    });
    await page.reload();
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(false);
    await importProject(page, { 'main.py': 'print(42)\n' }, 'No isolation');
    await page.getByRole('button', { name: 'Run file', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('exit 0');
    await importProject(page, { 'main.py': 'input("Name? ")\n' }, 'Input without isolation');
    await page.getByRole('button', { name: 'Run file', exact: true }).click();
    await expect(page.getByRole('log')).toContainText('COOP/COEP');
    await expect(page.getByRole('status')).toContainText('exit 1');
    await breakpoint(page, 1);
    await page.getByRole('button', { name: 'Run file', exact: true }).click();
    await expect(page.getByRole('log')).toContainText('Debugging requires cross-origin isolation');
  });
});

test('formats Python, completes contextually, validates syntax and persists settings', async ({
  page,
}) => {
  await importProject(page, { 'main.py': 'value={"a":1}\nprint( value )\n' });
  await page.getByRole('button', { name: 'Format Document', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Format Document', exact: true })).toBeEnabled();
  await expect(page.locator('.view-lines')).toContainText('print(value)');
  await page.keyboard.press('Control+Shift+P');
  await page.getByRole('combobox').fill('Open settings');
  await page.keyboard.press('Enter');
  await page.getByLabel('Color theme').selectOption('light');
  await page.getByLabel('Editor font size').fill('18');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await importProject(page, { 'main.py': 'greeting = "hello"\ngreeting.up' }, 'Completion');
  await page.getByRole('textbox', { name: 'Editor content' }).focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Control+Alt+Space');
  await expect(page.locator('.suggest-widget')).toContainText('upper', { timeout: 25000 });
  await page.keyboard.press('Escape');
  await importProject(
    page,
    {
      'main.py': 'from helper import project_helper\nproject_h',
      'helper.py': 'def project_helper():\n    return 42\n',
    },
    'Project completion',
  );
  await page.getByRole('textbox', { name: 'Editor content' }).focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Control+Alt+Space');
  await expect(page.locator('.suggest-widget')).toContainText('project_helper', { timeout: 25000 });
  await page.keyboard.press('Escape');
  await importProject(page, { 'main.py': 'def broken(\n' }, 'Syntax');
  await page.getByRole('tab', { name: 'Problems', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Problems' })).toContainText('Python syntax');
});

test('exports and reimports a project through real ZIP downloads', async ({ page }) => {
  await importProject(
    page,
    { 'main.py': 'from lib.tools import answer\nprint(answer)\n', 'lib/tools.py': 'answer = 42\n' },
    'Archive',
  );
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  const ready = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ZIP', exact: true }).click();
  const downloaded = await ready;
  await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
    name: 'Restored.zip',
    mimeType: 'application/zip',
    buffer: await readFile((await downloaded.path())!),
  });
  await expect(page.locator('.workspace-title')).toContainText('Restored');
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0');
  await expect(page.getByRole('log')).toContainText('42');
});

test('creates, renames, moves and deletes files and projects with keyboard palettes', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('pkg');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.keyboard.press('Control+Shift+P');
  await page.getByRole('combobox').fill('New file');
  await page.keyboard.press('Enter');
  await page.getByLabel('Project path').fill('pkg/module.py');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('treeitem', { name: 'module.py', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('renamed.py');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('treeitem', { name: 'renamed.py', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Move to path…', exact: true }).click();
  await page.getByLabel('Destination path (including name)').fill('renamed.py');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.keyboard.press('Control+p');
  await page.getByRole('combobox').fill('main.py');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'main.py', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('treeitem', { name: 'renamed.py', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete…', exact: true }).click();
  await page.getByLabel('Type renamed.py to confirm deletion').fill('renamed.py');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'renamed.py', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Disposable');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Disposable', exact: true }).click();
  await page.getByLabel('Type Disposable to confirm deletion').fill('Disposable');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Project manager' })).not.toContainText(
    'Disposable',
  );
});
