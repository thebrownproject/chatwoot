/** @type {import('tailwindcss').Config} */
// Minimal config for the shared UI package. Consuming apps merge their own
// tailwind configs (themes, plugins, etc.) on top of this one.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
