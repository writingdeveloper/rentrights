import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-url';

// Explicitly welcome AI/search crawlers so RentRights can be cited by AI answer
// engines as well as indexed by classic search. Nothing on the site is private.
const AI_AND_SEARCH_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot',
  'Google-Extended', 'Applebot-Extended', 'Bingbot',
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
