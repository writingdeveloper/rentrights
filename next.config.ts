import type { NextConfig } from "next";
import { PRODUCTION_CSP } from './lib/security/csp';

const isProd = process.env.NODE_ENV === 'production';

// Content-Security-Policy lives in lib/security/csp.ts (pure + unit-tested so a
// future edit can't silently drop the GA4 allowances again). Applied in
// PRODUCTION ONLY — `next dev` (React Refresh + HMR) needs 'unsafe-eval' + a
// websocket, so a CSP there would break the dev server.
const csp = PRODUCTION_CSP;

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
          // 2-year HSTS. includeSubDomains scopes only to *.rentrights.* (none
          // today) — it does NOT touch the parent writingdeveloper.blog. No
          // `preload` on purpose: that would entangle the whole apex domain.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
