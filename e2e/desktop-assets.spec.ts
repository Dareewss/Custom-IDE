import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { serveDesktop } from '../desktop/server';

test('renders local 3D text under the actual packaged desktop content policy', async ({
  page,
  request,
}) => {
  const { origin, server } = await serveDesktop(resolve('dist'), 0);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const response = await request.get(origin);
    const policy = response.headers()['content-security-policy'];
    expect(policy).toContain("script-src 'self' blob: 'wasm-unsafe-eval'");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(origin);
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    const canvas = page.locator('.code-canvas canvas');
    await expect(canvas).toHaveAttribute('data-labels-ready', /[1-9]/, { timeout: 30000 });
    await expect(canvas).toHaveAttribute('data-label-materials-opaque', 'true');
    await expect(page.getByRole('region', { name: 'Code overview', exact: true })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    expect(errors).toEqual([]);
  } finally {
    await page.goto('about:blank');
    await new Promise<void>((accept, reject) =>
      server.close((error) => (error ? reject(error) : accept())),
    );
  }
});
