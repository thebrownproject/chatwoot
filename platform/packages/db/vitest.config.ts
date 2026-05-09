import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  css: { postcss: { plugins: [] } },
  root: __dirname,
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    root: __dirname,
  },
});
