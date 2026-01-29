/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serving images from the stories folder
  images: {
    minimumCacheTTL: 2678400, // 31 days — prevents re-optimizing the same image
    formats: ['image/webp'],  // Only webp (not avif+webp) — halves transformations
    deviceSizes: [640, 828, 1080, 1920], // Fewer breakpoints = fewer variants
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // Fewer thumbnail sizes
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
