import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// UMD wrapper that mounts on third-party sites via
// `<script src="https://cdn/sdk.js">`. Replaces `app/javascript/sdk/sdk.js`.
//
// Hard size budget: 40KB minified. The original Rails-served bundle ships
// alongside on every customer site, so byte-cost is load-bearing.
//
// TODO: wire `rollup-plugin-visualizer` (open on `pnpm build`) and a
// CI-time size check that fails the build above the budget. Keep
// `external: []` so the global is a single file — anything added to
// `dependencies` must be tree-shakable and inlined here.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Chatwoot',
      fileName: 'sdk',
      formats: ['umd'],
    },
    rollupOptions: {
      // Inline everything — no externals allowed for the public global.
      external: [],
      output: {
        // Single global, no chunk splitting on the CDN bundle.
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    // 40KB hard budget; warn long before we hit it so PRs notice early.
    chunkSizeWarningLimit: 40,
  },
  server: {
    port: 3004,
  },
});
