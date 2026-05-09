// Node.js 25 ships a broken `globalThis.localStorage` (empty object, no methods).
// Polyfill it so libraries checking `typeof localStorage !== 'undefined'` don't crash.
if (
  typeof globalThis.localStorage !== 'undefined' &&
  typeof globalThis.localStorage.getItem !== 'function'
) {
  const noop = () => null;
  globalThis.localStorage = {
    getItem: noop,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    key: noop,
    length: 0,
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@buildpass/shell'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
