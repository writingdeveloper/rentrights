import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// Content-Security-Policy, no-nonce variant (Next.js "Without Nonces" guide).
// 'unsafe-inline' is required for next/font's injected <style>, Next's hydration
// inline scripts, and our (already <-escaped) JSON-LD; 'self' still blocks
// injected EXTERNAL scripts/styles, and the structural directives harden against
// plugin content, <base> hijacking, clickjacking, and form-action hijacking.
// Vercel Web Analytics loads + beacons from same-origin /_vercel/insights/*, so
// 'self' covers it. Applied in PRODUCTION ONLY: `next dev` (React Refresh + HMR)
// needs 'unsafe-eval' and a websocket, so a CSP there would break the dev server.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // Explicit connect-src 'self' for Vercel Analytics (/_vercel/insights/*)
  // and any fetch calls this app makes; keeps same-origin and makes future
  // additions (e.g. a CDN) an explicit, reviewable change.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

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
