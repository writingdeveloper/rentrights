import { describe, it, expect, afterEach, vi } from 'vitest';
import { siteUrl } from '@/lib/seo/site-url';

function clearEnv() { delete process.env.NEXT_PUBLIC_SITE_URL; }

describe('siteUrl', () => {
  afterEach(() => { clearEnv(); vi.unstubAllEnvs(); });

  it('prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash', () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://rentrights.soursea.io/';
    expect(siteUrl()).toBe('https://rentrights.soursea.io');
  });

  it('defaults to localhost in development/test', () => {
    clearEnv();
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  // Cloudflare Workers has no VERCEL_*-style URL auto-detection: a production
  // build without NEXT_PUBLIC_SITE_URL would silently ship localhost canonicals
  // in robots/sitemap/OG. Fail the build loudly instead.
  it('throws in production when the resolved origin would be localhost', () => {
    clearEnv();
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => siteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it('returns the explicit origin in production', () => {
    clearEnv();
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://rentrights.soursea.io';
    expect(siteUrl()).toBe('https://rentrights.soursea.io');
  });
});
