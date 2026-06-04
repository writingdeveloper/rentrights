import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-url';
import { LEGAL } from '@/lib/legal/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl()}/`,
      lastModified: new Date(LEGAL.lastVerified),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
