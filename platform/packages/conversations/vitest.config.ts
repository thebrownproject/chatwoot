import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(import.meta.dirname),
  css: { postcss: {} },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
