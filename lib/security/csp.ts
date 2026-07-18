/**
 * Production Content-Security-Policy (no-nonce variant, Next.js "Without Nonces").
 *
 * 'unsafe-inline' covers next/font's injected <style>, Next's hydration inline
 * scripts, and our (<-escaped) JSON-LD; 'self' still blocks injected EXTERNAL
 * scripts/styles, and the structural directives harden against plugin content,
 * <base> hijacking, clickjacking, and form-action hijacking.
 *
 * Google Analytics 4 (gtag.js) needs three cross-origin allowances: the loader
 * from googletagmanager.com (script-src), and the measurement beacons to
 * google-analytics.com (connect-src, plus img-src for the image-beacon fallback).
 * Ad/remarketing domains (doubleclick, googlesyndication) are deliberately NOT
 * allowed — GA runs with ad signals denied (see lib/analytics/config gaInitSnippet).
 *
 * Applied in PRODUCTION ONLY: `next dev` (React Refresh + HMR) needs 'unsafe-eval'
 * and a websocket, so a CSP there would break the dev server.
 */
const GA_SCRIPT = 'https://www.googletagmanager.com';
const GA_CONNECT = [
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://www.googletagmanager.com',
];
const GA_IMG = [
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://www.googletagmanager.com',
];

export const PRODUCTION_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GA_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${GA_IMG.join(' ')}`,
  "font-src 'self'",
  // 'self' for same-origin fetches (/api/*); the google-analytics/googletagmanager
  // hosts are the GA4 measurement beacon endpoints.
  `connect-src 'self' ${GA_CONNECT.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');
