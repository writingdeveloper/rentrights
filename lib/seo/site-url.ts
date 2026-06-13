/**
 * Absolute site origin with no trailing slash.
 *   1. NEXT_PUBLIC_SITE_URL — explicit; REQUIRED for production builds.
 *      Inlined by `next build` (loaded from the committed .env.production), so it
 *      must exist in the BUILD environment: prerendered routes (robots/sitemap/OG)
 *      bake the build-time value, and a runtime var alone cannot fix them.
 *   2. http://localhost:3000 — dev/test fallback.
 * A missing value in production fails the build loudly instead of silently
 * shipping localhost canonicals.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = raw.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && url.startsWith('http://localhost')) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set for production builds (see .env.production).');
  }
  return url;
}
