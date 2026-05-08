import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    postcss: {},
  },
  test: {
    globals: false,
    environment: 'node',
    root: '.',
    include: ['src/**/*.test.ts'],
  },
});
