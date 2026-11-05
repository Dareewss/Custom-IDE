import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';
import JSZip from 'jszip';

const port = 4184;
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  { windowsHide: true, stdio: 'pipe' },
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  headless: true,
});
const reports = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) break;
    } catch {
      /* Server is starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (const sample of process.env.OVERVIEW_BENCH_SAMPLE
    ? [process.env.OVERVIEW_BENCH_SAMPLE]
    : ['1000', '5000', 'mixed']) {
    let target = sample === '1000' ? 1000 : 5000;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${port}`);
    const zip = new JSZip(),
      count = target / 100 - 2;
    for (let file = 0; file < 100; file++) {
      const name = (i) => `module_${String(i).padStart(3, '0')}`;
      const lines = [`# ${name(file)} benchmark`, `import ${name((file + 1) % 100)}`];
      if (sample === 'mixed')
        lines.push(
          'class Widget:',
          '    def update(self, value):',
          '        items = [1, 2, 3, 4]',
          '        total = value',
          '        for entry in items:',
          '            if entry:',
          '                total += 1',
          '            else:',
          '                total -= 1',
          '        return total',
          '    def reset(self):',
          '        value = 0',
          '        while value < 2:',
          '            value += 1',
          '        return value',
          'def build(value):',
          '    return value + 1',
        );
      const variables = sample === 'mixed' ? 50 - lines.length : count;
      for (let row = 0; row < variables; row++)
        lines.push(
          `value_${row} = ${row % 3 === 0 ? row : row % 3 === 1 ? JSON.stringify(`item ${row}`) : 'True'}`,
        );
      zip.file(`${name(file)}.py`, lines.join('\n') + '\n');
    }
    await page.getByRole('button', { name: 'Manage projects', exact: true }).click();
    const started = performance.now();
    await page.getByLabel('Import ZIP file', { exact: true }).setInputFiles({
      name: `Benchmark${sample}.zip`,
      mimeType: 'application/zip',
      buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    });
    const panel = page.getByRole('region', { name: 'Code overview', exact: true });
    await page
      .locator('.workspace-title')
      .filter({ hasText: `Benchmark${sample}` })
      .waitFor();
    if (sample === 'mixed') {
      await panel
        .locator(':scope:not([data-model-nodes="0"])[aria-busy="false"]')
        .waitFor({ timeout: 120000 });
      target = Number(await panel.getAttribute('data-model-nodes'));
    } else
      await panel
        .locator(`:scope[data-model-nodes="${target}"][aria-busy="false"]`)
        .waitFor({ timeout: 120000 });
    const initialAnalysisMs = Number(await panel.getAttribute('data-analysis-ms'));
    const initialLayoutMs = Number(await panel.getAttribute('data-layout-ms'));
    const canvas = page.locator('.code-canvas canvas');
    await page
      .getByRole('group', { name: 'Workspace layout', exact: true })
      .getByRole('button', { name: '3D', exact: true })
      .click();
    await canvas.locator(':scope[data-labels-ready]').waitFor({ timeout: 120000 });
    await page.waitForTimeout(1200);
    const readyMs = performance.now() - started;
    const renderer = await canvas.evaluate((element) => {
      const gl = element.getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
    const idleBefore = Number(await canvas.getAttribute('data-render-frames'));
    await page.waitForTimeout(600);
    const idleFrames = Number(await canvas.getAttribute('data-render-frames')) - idleBefore;
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const frames = await canvas.evaluate(async (element) => {
      const box = element.getBoundingClientRect(),
        start = performance.now(),
        frames = Number(element.dataset.renderFrames);
      const intervals = [];
      let previous = start;
      for (let i = 0; i < 120; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const now = performance.now();
        intervals.push(now - previous);
        previous = now;
        element.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'mouse',
            buttons: 1,
            clientX: box.x + box.width / 2 + Math.sin(i / 20) * 100,
            clientY: box.y + box.height / 2 + Math.cos(i / 25) * 40,
          }),
        );
      }
      return {
        elapsedMs: performance.now() - start,
        rendered: Number(element.dataset.renderFrames) - frames,
        intervals,
        calls: Number(element.dataset.drawCalls),
        triangles: Number(element.dataset.triangles),
        geometries: Number(element.dataset.geometries),
      };
    });
    await page.mouse.up();
    await page
      .getByRole('group', { name: 'Workspace layout', exact: true })
      .getByRole('button', { name: 'Split', exact: true })
      .click();
    await page.getByRole('treeitem', { name: 'module_000.py', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Editor content' });
    await editor.focus();
    await editor.press('Control+End');
    await page.evaluate(() => {
      window.__atlasKeyFrames = [];
      document.addEventListener(
        'keydown',
        (event) => {
          if (event.key.length !== 1 && event.key !== 'Enter') return;
          const start = performance.now();
          requestAnimationFrame(() => window.__atlasKeyFrames.push(performance.now() - start));
        },
        true,
      );
    });
    await page.waitForTimeout(1000);
    const profiler = process.env.OVERVIEW_BENCH_PROFILE ? await context.newCDPSession(page) : null;
    if (profiler) {
      await profiler.send('Tracing.start', {
        categories: 'devtools.timeline',
        transferMode: 'ReportEvents',
      });
      await profiler.send('Profiler.enable');
      await profiler.send('Profiler.start');
    }
    const typingStarted = performance.now();
    await page.keyboard.type('\nprobe_value = 123\n', { delay: 5 });
    const typingMs = performance.now() - typingStarted;
    if (profiler) {
      const events = [];
      profiler.on('Tracing.dataCollected', (data) => events.push(...data.value));
      const complete = new Promise((resolve) => profiler.once('Tracing.tracingComplete', resolve));
      await profiler.send('Tracing.end');
      await complete;
      await writeFile('release/overview-typing-timeline.json', JSON.stringify(events));
      const profile = await profiler.send('Profiler.stop');
      await writeFile('release/overview-typing-profile.json', JSON.stringify(profile));
      await profiler.detach();
    }
    await panel
      .locator(`:scope[data-model-nodes="${target + 1}"][aria-busy="false"]`)
      .waitFor({ timeout: 120000 });
    const coldKeyFrames = await page.evaluate(() => window.__atlasKeyFrames.slice());
    await page.waitForTimeout(1000);
    await editor.focus();
    await editor.press('Control+End');
    await page.evaluate(() => {
      window.__atlasKeyFrames = [];
    });
    const warmStarted = performance.now();
    await page.keyboard.type('warm_probe = 456\n', { delay: 40 });
    const warmTypingMs = performance.now() - warmStarted;
    await panel
      .locator(`:scope[data-model-nodes="${target + 2}"][aria-busy="false"]`)
      .waitFor({ timeout: 120000 });
    const sorted = frames.intervals.slice().sort((a, b) => a - b);
    const keyFrames = await page.evaluate(() => window.__atlasKeyFrames);
    keyFrames.sort((a, b) => a - b);
    const result = {
      sample,
      initialAnalysisMs,
      initialLayoutMs,
      keyFrameP95Ms: keyFrames.length
        ? +keyFrames[Math.floor(keyFrames.length * 0.95)].toFixed(1)
        : null,
      targetNodes: target,
      files: 100,
      sourceLines: sample === '1000' ? 1000 : 5000,
      renderer,
      readyMs: +readyMs.toFixed(1),
      analysisMs: Number(await panel.getAttribute('data-analysis-ms')),
      layoutMs: Number(await panel.getAttribute('data-layout-ms')),
      fps: +((frames.rendered / frames.elapsedMs) * 1000).toFixed(1),
      p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
      drawCalls: frames.calls,
      triangles: frames.triangles,
      geometries: frames.geometries,
      idleFrames,
      typingMs: +typingMs.toFixed(1),
      coldKeyFrameP95Ms: coldKeyFrames.sort((a, b) => a - b)[
        Math.floor(coldKeyFrames.length * 0.95)
      ],
      warmTypingMs: +warmTypingMs.toFixed(1),
      warmKeyDelayMs: 40,
      errors,
    };
    reports.push(result);
    console.log(JSON.stringify(result));
    await context.close();
  }
  await mkdir('release', { recursive: true });
  await writeFile(
    process.env.OVERVIEW_BENCH_REPORT || 'release/overview-benchmark.json',
    JSON.stringify(reports, null, 2) + '\n',
  );
} finally {
  await browser.close();
  server.kill();
}
