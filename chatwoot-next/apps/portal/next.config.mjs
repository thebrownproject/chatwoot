/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Docker image small — only the files
  // Next actually traces at build time get copied in.
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@chatwoot-next/ui', '@chatwoot-next/i18n'],
};

export default nextConfig;
