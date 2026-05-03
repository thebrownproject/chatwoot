import type { Config } from 'tailwindcss';

// Stub Tailwind config — placeholder theme tokens; real palette lives in
// `tailwind.config.js` of the legacy Rails app and will be ported into
// `@chatwoot-next/ui` over time.
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // placeholder brand tokens; replace with Chatwoot palette
        brand: {
          DEFAULT: '#1f93ff',
          fg: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
