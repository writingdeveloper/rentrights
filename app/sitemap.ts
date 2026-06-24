import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-url';
import { CONTENT_LAST_UPDATED } from '@/lib/seo/content-updated';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date(CONTENT_LAST_UPDATED);
  const languages = { en: `${base}/`, es: `${base}/es` };
  const guideLanguages = {
    en: `${base}/guides/la-rent-increase-2026`,
    es: `${base}/es/guides/la-rent-increase-2026`,
  };
  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages },
    },
    {
      // Spanish has its own crawlable URL so Googlebot (en-US) can index it.
      url: `${base}/es`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: { languages },
    },
    {
      // Cornerstone SEO/GEO explainer (EN).
      url: `${base}/guides/la-rent-increase-2026`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: { languages: guideLanguages },
    },
    {
      // Cornerstone explainer (ES) — its own crawlable URL.
      url: `${base}/es/guides/la-rent-increase-2026`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages: guideLanguages },
    },
  ];
}
