import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers },
  preview: { headers },
  worker: { format: 'es' },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
