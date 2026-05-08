// Shadows the parent Chatwoot postcss.config.js which requires postcss-preset-env.
// Without this, Vitest's Vite server walks up the directory tree and fails to load it.
export default {};
