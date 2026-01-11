/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serving images from the stories folder
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Serve static files from stories folder
  async rewrites() {
    return [
      {
        source: '/stories/:path*',
        destination: '/api/stories/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
