import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    postcss: {},
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['**/*.test.ts'],
    testTimeout: 10_000,
  },
});
