import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

// Widget bundle budget: 200KB gzipped (embedded cross-domain via SDK iframe).
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
      name: 'ChatwootWidget',
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      // Inline everything: embed targets cannot resolve bare specifiers.
      external: [],
    },
  },
});
