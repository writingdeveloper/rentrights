import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pickInitialLocale } from '@/lib/i18n/detect';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';
import { siteUrl } from '@/lib/seo/site-url';
import { JsonLd } from '@/components/JsonLd';
import { Analytics } from '@vercel/analytics/next';
import { pageAlternates } from '@/lib/seo/alternates';
import { organizationJsonLd, webSiteJsonLd, webApplicationJsonLd } from '@/lib/seo/jsonld';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], display: 'swap' });

async function getLocale() {
  const h = await headers();
  // The /es route (via middleware) forces Spanish regardless of cookie/Accept-Language.
  const forced = h.get('x-rr-locale');
  if (forced === 'en' || forced === 'es') return forced;
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  return pickInitialLocale(cookieValue, h.get('accept-language'));
}

// True only on the /es URL (the middleware sets this header just there), so it
// identifies the PATH for canonical/hreflang — distinct from a Spanish rendering
// of "/" that an Accept-Language: es user negotiates.
async function isSpanishPath() {
  return (await headers()).get('x-rr-locale') === 'es';
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFCFD' },
    { media: '(prefers-color-scheme: dark)', color: '#0C111A' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = CATALOG[locale];
  const title = translate(c, 'meta.title', undefined, CATALOG.en);
  const description = translate(c, 'meta.description', undefined, CATALOG.en);
  const keywords = translate(c, 'meta.keywords', undefined, CATALOG.en);
  const ogLocale = locale === 'es' ? 'es_ES' : 'en_US';
  const esPath = await isSpanishPath();
  const alternates = pageAlternates(esPath);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: '%s · RentRights' },
    description,
    applicationName: 'RentRights',
    keywords: keywords.split(',').map((k) => k.trim()),
    category: 'reference',
    authors: [{ name: 'RentRights' }],
    creator: 'RentRights',
    publisher: 'RentRights',
    alternates: { canonical: alternates.canonical, languages: alternates.languages },
    openGraph: {
      type: 'website',
      url: alternates.canonical,
      siteName: 'RentRights',
      title,
      description,
      locale: ogLocale,
      alternateLocale: ogLocale === 'es_ES' ? 'en_US' : 'es_ES',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      ...(process.env.BING_SITE_VERIFICATION ? { other: { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } } : {}),
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const base = siteUrl();
  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationJsonLd(base)} />
        <JsonLd data={webSiteJsonLd(base, locale)} />
        <JsonLd data={webApplicationJsonLd(base, locale)} />
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        {/* Cookieless Vercel Web Analytics — no consent banner needed, keeps the
            "nothing stored" posture. Collects data only when deployed on Vercel
            with Analytics enabled. */}
        <Analytics />
      </body>
    </html>
  );
}
