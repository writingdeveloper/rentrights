import Script from 'next/script';
import { GA_MEASUREMENT_ID, analyticsEnabled, gaScriptSrc, gaInitSnippet } from '@/lib/analytics/config';

/**
 * Loads Google Analytics 4 (gtag.js) site-wide with a privacy-forward stance —
 * ad signals/personalization denied, analytics granted (see gaInitSnippet). Loads
 * `afterInteractive` so it never blocks first-party rendering. Renders nothing
 * unless it's a production build with a valid Measurement ID, so local dev / e2e
 * never pollute the real property.
 *
 * See /privacy for the user-facing disclosure + opt-out.
 */
export function GoogleAnalytics() {
  if (!analyticsEnabled()) return null;
  return (
    <>
      <Script src={gaScriptSrc(GA_MEASUREMENT_ID)} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {gaInitSnippet(GA_MEASUREMENT_ID)}
      </Script>
    </>
  );
}
