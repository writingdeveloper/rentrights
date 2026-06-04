/**
 * Absolute site origin with no trailing slash. Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL          — explicit (self-host / production)
 *   2. https://VERCEL_PROJECT_PRODUCTION_URL — Vercel production domain
 *   3. https://VERCEL_URL            — Vercel preview deployment
 *   4. http://localhost:3000         — dev fallback
 * The app is portable (not Vercel-only), so this works on Vercel and self-host.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}
