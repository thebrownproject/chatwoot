import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    globals: false,
    environment: 'node',
    include: ['**/*.test.ts'],
    root: resolve(__dirname),
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
