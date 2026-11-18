import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { layeredProject } from './fixtures/layered-project';
test.use({ storageState: { cookies: [], origins: [] } });
for (const sample of ['small', 'medium', 'large', 1, 10] as const)
  test(`measures actual source workload ${sample}`, async ({ page }) => {
    test.setTimeout(180000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const zip = new JSZip();
    if (typeof sample === 'number') {
      for (const [path, node] of Object.entries(layeredProject(100, sample)))
        if (node.kind === 'file') zip.file(path, node.content);
    } else {
      const lines = { small: 25, medium: 50, large: 250 }[sample];
      zip.file(
        'main.py',
        await readFile(`tests/fixtures/python/bug_${sample}_${lines}.py`, 'utf8'),
      );
    }
    await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
    await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
      name: 'Measured.zip',
      mimeType: 'application/zip',
      buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    });
    const panel = page.getByRole('region', { name: 'Code overview', exact: true }),
      canvas = page.locator('.code-canvas canvas');
    await expect(panel).toHaveAttribute('aria-busy', 'false');
    await expect(canvas).toHaveAttribute('data-tile-instances', /[1-9]/, { timeout: 60000 });
    await page
      .getByRole('group', { name: 'Workspace layout', exact: true })
      .getByRole('button', { name: '3D', exact: true })
      .click();
    if (typeof sample === 'number')
      await page.getByRole('treeitem', { name: 'module_050.py', exact: true }).click();
    await page.getByLabel('Structure view mode', { exact: true }).selectOption('layers');
    await expect(canvas).toHaveAttribute('data-layer-progress', '1');
    await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
    await page.waitForTimeout(1200);
    const initial = {
      nodes: Number(await panel.getAttribute('data-model-nodes')),
      tiles: Number(await canvas.getAttribute('data-tile-instances')),
      analysisMs: Number(await panel.getAttribute('data-analysis-ms')),
      layoutMs: Number(await panel.getAttribute('data-layout-ms')),
    };
    const navigation = page.getByRole('group', { name: '3D navigation', exact: true });
    await navigation.focus();
    // Expansion at a close source zoom is measured separately from the overview aggregation.
    for (let i = 0; i < (typeof sample === 'number' ? 12 : 2); i++) await page.keyboard.press('+');
    await page.waitForTimeout(700);
    const instances = Number(await canvas.getAttribute('data-tile-instances'));
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    const frames = await canvas.evaluate(async (element) => {
      const el = element as HTMLCanvasElement,
        start = performance.now(),
        before = Number(el.dataset.sceneFrames),
        intervals: number[] = [];
      let previous = start;
      const b = el.getBoundingClientRect();
      for (let i = 0; i < 90; i++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        intervals.push(now - previous);
        previous = now;
        el.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'mouse',
            buttons: 1,
            clientX: b.x + b.width * 0.5 + Math.sin(i / 15) * 25,
            clientY: b.y + b.height * 0.5 + Math.cos(i / 20) * 15,
          }),
        );
      }
      const gl = el.getContext('webgl2')!,
        ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        elapsedMs: performance.now() - start,
        rendered: Number(el.dataset.sceneFrames) - before,
        intervals,
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
    expect(frames.rendered).toBeGreaterThan(30);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    const beforeIdle = Number(await canvas.getAttribute('data-scene-frames'));
    await page.waitForTimeout(600);
    const idle = Number(await canvas.getAttribute('data-scene-frames')) - beforeIdle;
    expect(idle).toBe(0);
    await page
      .getByRole('group', { name: 'Workspace layout', exact: true })
      .getByRole('button', { name: 'Split', exact: true })
      .click();
    const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
    await editor.focus();
    await page.keyboard.press('Control+End');
    const latency = page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const times: number[] = [];
          let timer: ReturnType<typeof setTimeout>;
          const listener = () => {
            const start = performance.now();
            requestAnimationFrame(() => times.push(performance.now() - start));
            clearTimeout(timer);
            timer = setTimeout(() => {
              document.removeEventListener('keydown', listener, true);
              resolve(times);
            }, 350);
          };
          document.addEventListener('keydown', listener, true);
        }),
    );
    await page.keyboard.type('\n# measured typing while 3D remains open\n', { delay: 12 });
    const keyFrames = await latency;
    const p95 = (a: number[]) =>
      [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * 0.95))];
    const report = {
      ...initial,
      expandedInstances: instances,
      renderedFps: (frames.rendered * 1000) / frames.elapsedMs,
      frameP95Ms: p95(frames.intervals),
      idleFrames: idle,
      keyToFrameP95Ms: p95(keyFrames),
      keySamples: keyFrames.length,
      renderer: frames.renderer,
      labels: Number(await canvas.getAttribute('data-tile-labels')),
    };
    expect(instances).toBeGreaterThan(initial.tiles * 0.5);
    expect(report.keySamples).toBeGreaterThan(20);
    expect(report.keyToFrameP95Ms).toBeLessThan(250);
    await expect(canvas).toHaveAttribute('data-tile-meshes', '1');
    await mkdir('docs/screenshots/phase2.5', { recursive: true });
    await writeFile(
      `docs/screenshots/phase2.5/performance-${sample}.json`,
      JSON.stringify(report, null, 2),
    );
    console.log('Layer measurements', JSON.stringify(report));
  });
