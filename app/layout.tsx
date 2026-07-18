import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { getServerLocale, isForcedEsPath } from '@/lib/i18n/server-locale';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';
import { siteUrl } from '@/lib/seo/site-url';
import { JsonLd } from '@/components/JsonLd';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { pageAlternates } from '@/lib/seo/alternates';
import { organizationJsonLd, webSiteJsonLd, webApplicationJsonLd } from '@/lib/seo/jsonld';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], display: 'swap', axes: ['opsz', 'SOFT', 'WONK'] });

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F4EF' },
    { media: '(prefers-color-scheme: dark)', color: '#15140F' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const c = CATALOG[locale];
  const title = translate(c, 'meta.title', undefined, CATALOG.en);
  const description = translate(c, 'meta.description', undefined, CATALOG.en);
  const keywords = translate(c, 'meta.keywords', undefined, CATALOG.en);
  const ogLocale = locale === 'es' ? 'es_ES' : 'en_US';
  const esPath = await isForcedEsPath();
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
  const locale = await getServerLocale();
  const base = siteUrl();
  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationJsonLd(base)} />
        <JsonLd data={webSiteJsonLd(base, locale)} />
        <JsonLd data={webApplicationJsonLd(base, locale)} />
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        {/* Google Analytics 4 — privacy-forward (ad signals off, analytics on),
            no consent banner. The address/answers are never sent to GA (they live
            in POST bodies). Disclosed with an opt-out at /privacy. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
