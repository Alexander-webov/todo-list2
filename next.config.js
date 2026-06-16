/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['rss-parser', 'cheerio'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      // www → без-www (канонический домен — allfreelancershere.ru). 301.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.allfreelancershere.ru' }],
        destination: 'https://allfreelancershere.ru/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
