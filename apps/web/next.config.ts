import type { NextConfig } from 'next';

const internalApiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@effect/auth', '@effect/ui'],
  rewrites() {
    return Promise.resolve([
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ]);
  },
};

export default nextConfig;
