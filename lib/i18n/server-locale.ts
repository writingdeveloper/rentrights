import { cookies, headers } from 'next/headers';
import { pickInitialLocale } from '@/lib/i18n/detect';

/**
 * The locale to render on the server. The `/es*` proxy sets `x-rr-locale: es`,
 * which forces Spanish regardless of cookie/Accept-Language (so Googlebot, which
 * crawls as en-US, can index the Spanish URLs). Otherwise we negotiate from the
 * cookie + Accept-Language. Shared by the root layout and content routes.
 */
export async function getServerLocale(): Promise<'en' | 'es'> {
  const h = await headers();
  const forced = h.get('x-rr-locale');
  if (forced === 'en' || forced === 'es') return forced;
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  return pickInitialLocale(cookieValue, h.get('accept-language'));
}

/**
 * True only on a forced `/es*` URL (the proxy sets the header just there), so it
 * identifies the PATH for canonical/hreflang — distinct from a Spanish rendering
 * negotiated via Accept-Language on the non-/es URL.
 */
export async function isForcedEsPath(): Promise<boolean> {
  return (await headers()).get('x-rr-locale') === 'es';
}
