import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the archived Docker self-host path (deploy/docker/).
  // Vercel — the supported production target — builds natively and ignores this.
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
          // No feature on the site uses these powerful APIs; deny them site-wide.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
