/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@chatwoot-next/sdk-shared'],
  async headers() {
    // TODO: replace `*` with the actual origin resolved from the website
    // token / inbox lookup (see Rails `Widget::BaseController#set_web_widget`
    // and `Public::Api::V1::*` controllers). The wildcard is a temporary
    // skeleton placeholder — production must echo back the validated
    // request origin so credentials can be sent cross-domain.
    return [
      {
        source: '/widget/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Auth-Token' },
        ],
      },
      {
        source: '/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Auth-Token' },
        ],
      },
    ];
  },
};

export default nextConfig;
