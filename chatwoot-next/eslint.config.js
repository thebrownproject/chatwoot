import js from '@eslint/js';

// Minimal root flat config. Per-package configs should extend this and add
// their own framework/language rules (Next.js, Vue, etc.).
// TODO: per-package configs to add their own typescript-eslint plugin/parser
// and rules (e.g. via `typescript-eslint` package). Keeping the root config
// dependency-light so installs in individual workspaces aren't blocked.
export default [
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
];
