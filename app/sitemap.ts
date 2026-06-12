import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-url';
import { CONTENT_LAST_UPDATED } from '@/lib/seo/content-updated';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl()}/`,
      lastModified: new Date(CONTENT_LAST_UPDATED),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
