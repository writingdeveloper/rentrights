/**
 * Google Analytics 4 configuration.
 *
 * The Measurement ID is a PUBLIC value — it ships in the client bundle — so it is
 * committed here rather than kept in a host env var. That keeps setup zero-touch
 * (no Vercel/host dashboard step). Override per environment with NEXT_PUBLIC_GA_ID
 * (e.g. a staging property, or blank it to disable analytics on a build).
 *
 * Property: "RentRights" web stream (rentrights.writingdeveloper.blog) under the
 * "글쓰는 개발자" GA account.
 */
export const DEFAULT_GA_MEASUREMENT_ID = 'G-9NK7DXF449';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? DEFAULT_GA_MEASUREMENT_ID;

/** A GA4 Measurement ID looks like "G-XXXXXXXXXX". */
export function isValidGaId(id: string | undefined | null): boolean {
  return typeof id === 'string' && /^G-[A-Z0-9]{6,}$/.test(id);
}

/**
 * Whether analytics should load in the current environment. Only on a production
 * build with a valid id — so local `next dev` and the e2e/test runs never send
 * hits to the real property (no dev-traffic pollution).
 */
export function analyticsEnabled(
  env: string | undefined = process.env.NODE_ENV,
  id: string | undefined = GA_MEASUREMENT_ID,
): boolean {
  return env === 'production' && isValidGaId(id);
}

/** The gtag.js loader URL for a Measurement ID. */
export function gaScriptSrc(id: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${id}`;
}

/**
 * The inline gtag bootstrap. Privacy-forward: Google's advertising signals and
 * ad personalization are DENIED via Consent Mode, while analytics storage is
 * GRANTED — so we measure aggregate usage without ad tracking. No consent banner
 * is needed because this is a fixed default stance, not a per-user prompt. The
 * user's address/answers are never sent here (they live in POST bodies, and GA4
 * does not capture form field values).
 */
export function gaInitSnippet(id: string): string {
  return [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js', new Date());",
    "gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });",
    `gtag('config', '${id}');`,
  ].join('\n');
}
