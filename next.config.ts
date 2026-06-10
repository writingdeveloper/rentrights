import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: consumed by the OpenNext Cloudflare adapter build
  // (production) and by deploy/docker/Dockerfile (self-host fallback).
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
