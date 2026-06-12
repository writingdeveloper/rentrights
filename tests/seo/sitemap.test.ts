import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import { CONTENT_LAST_UPDATED } from '@/lib/seo/content-updated';
import { LEGAL } from '@/lib/legal/constants';

describe('sitemap', () => {
  it('uses the dedicated content-updated date for lastModified (not the legal-verified date)', () => {
    const entries = sitemap();
    const lastmod = entries[0].lastModified as Date;
    expect(new Date(lastmod).toISOString().slice(0, 10)).toBe(CONTENT_LAST_UPDATED);
  });

  it('lists both the default and the Spanish (/es) URL so Google can index each language', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/es'))).toBe(true);
  });

  it('content-updated is at least as recent as the legal verification date', () => {
    // The indexable home content can change without a legal re-verification, so
    // the content date must never lag behind lastVerified.
    expect(CONTENT_LAST_UPDATED >= LEGAL.lastVerified).toBe(true);
  });
});
