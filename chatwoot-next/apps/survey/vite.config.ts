import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

// Survey bundle budget: 80KB gzipped (one-shot embedded form, no realtime).
export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      formats: ['iife'],
      name: 'ChatwootSurvey',
      fileName: () => 'survey.js',
    },
    rollupOptions: {
      external: [],
    },
  },
});
