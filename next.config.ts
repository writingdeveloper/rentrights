import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-host: emit a minimal standalone server (.next/standalone/server.js).
  // Ignored by Vercel; harmless there.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Keeps the URL fragment (which can carry the renter's address in a
          // share link) out of Referer headers.
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default nextConfig;
