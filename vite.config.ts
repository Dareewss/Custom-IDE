import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { appWorkerPlugin } from './scripts/app-worker-plugin.ts';

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react(), tailwindcss(), appWorkerPlugin()],
  server: { headers },
  preview: { headers },
  worker: { format: 'es' },
  optimizeDeps: { include: ['web-tree-sitter', 'jszip', '@astral-sh/ruff-wasm-web'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
