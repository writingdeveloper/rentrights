import type { Metadata } from 'next';
import { cornerstoneStrings } from '@/lib/seo/cornerstone';
import { cornerstoneAlternates } from '@/lib/seo/alternates';
import { siteUrl } from '@/lib/seo/site-url';
import { getServerLocale, isForcedEsPath } from '@/lib/i18n/server-locale';
import { CornerstoneArticle } from '@/components/CornerstoneArticle';

// Served at /guides/la-rent-increase-2026 (EN, or ES negotiated via Accept-Language)
// and at /es/guides/la-rent-increase-2026 (forced ES via the proxy's x-rr-locale
// header). Reading the locale opts this route into dynamic rendering — same as "/".

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const esPath = await isForcedEsPath();
  const s = cornerstoneStrings(new Date(), locale);
  const alt = cornerstoneAlternates(esPath);
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    alternates: { canonical: alt.canonical, languages: alt.languages },
    openGraph: {
      type: 'article',
      url: alt.canonical,
      title: s.metaTitle,
      description: s.metaDescription,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
    },
  };
}

export default async function Page() {
  const locale = await getServerLocale();
  const esPath = await isForcedEsPath();
  const path = esPath ? '/es/guides/la-rent-increase-2026' : '/guides/la-rent-increase-2026';
  return <CornerstoneArticle now={new Date()} locale={locale} base={siteUrl()} path={path} />;
}
