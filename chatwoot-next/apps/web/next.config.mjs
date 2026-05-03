// Stub Next.js config for the agent-facing dashboard.
// Enables typed routes and transpiles workspace UI/editor/realtime packages.
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: [
    '@chatwoot-next/ui',
    '@chatwoot-next/editor',
    '@chatwoot-next/realtime-client',
  ],
};

export default nextConfig;
