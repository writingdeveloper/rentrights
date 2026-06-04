import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pickInitialLocale } from '@/lib/i18n/detect';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';
import { siteUrl } from '@/lib/seo/site-url';
import { JsonLd } from '@/components/JsonLd';
import { organizationJsonLd, webSiteJsonLd, webApplicationJsonLd } from '@/lib/seo/jsonld';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], display: 'swap' });

async function getLocale() {
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  const acceptLanguage = (await headers()).get('accept-language');
  return pickInitialLocale(cookieValue, acceptLanguage);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = CATALOG[locale];
  const title = translate(c, 'meta.title', undefined, CATALOG.en);
  const description = translate(c, 'meta.description', undefined, CATALOG.en);
  const keywords = translate(c, 'meta.keywords', undefined, CATALOG.en);
  const ogLocale = locale === 'es' ? 'es_ES' : 'en_US';
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
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
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
      </body>
    </html>
  );
}
