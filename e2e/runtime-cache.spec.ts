import { test, expect } from '@playwright/test';

test('can open, analyze and run Python offline immediately after app installation', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage projects', exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((done) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => done(), { once: true }),
      );
  });
  await context.setOffline(true);
  await page.getByRole('treeitem', { name: 'main.py', exact: true }).click();
  await page.locator('.monaco-editor').waitFor();
  await page.getByRole('button', { name: 'Run file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('exit 0', { timeout: 20000 });
  await expect(page.getByRole('log')).toContainText('Hello, world!');
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  await editor.focus();
  await editor.press('Control+A');
  await page.keyboard.insertText("value={'a':1}\nprint(value)\n");
  await page.getByRole('button', { name: 'Format Document', exact: true }).click();
  await expect(page.locator('.view-lines')).toContainText('value = {"a": 1}');
  await editor.focus();
  await editor.press('Control+A');
  await page.keyboard.insertText('greeting = "hello"\ngreeting.up');
  await editor.press('Control+End');
  await editor.press('Control+Alt+Space');
  await expect(page.locator('.suggest-widget')).toContainText('upper', { timeout: 30000 });
  await editor.press('Escape');
  await editor.press('Control+A');
  await page.keyboard.insertText('def broken(\n');
  await page.getByRole('tab', { name: 'Problems', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Problems' })).toContainText('Python syntax');
  await expect(page.locator('.error-toast')).toHaveCount(0);
});
