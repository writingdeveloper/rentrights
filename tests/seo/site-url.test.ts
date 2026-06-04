import { describe, it, expect, afterEach } from 'vitest';
import { siteUrl } from '@/lib/seo/site-url';

const KEYS = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'] as const;
function clearEnv() { for (const k of KEYS) delete process.env[k]; }

describe('siteUrl', () => {
  afterEach(clearEnv);

  it('prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash', () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://rentrights.org/';
    expect(siteUrl()).toBe('https://rentrights.org');
  });

  it('falls back to the Vercel production domain (https prefixed)', () => {
    clearEnv();
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'rentrights.vercel.app';
    expect(siteUrl()).toBe('https://rentrights.vercel.app');
  });

  it('falls back to the Vercel preview URL', () => {
    clearEnv();
    process.env.VERCEL_URL = 'rr-abc123.vercel.app';
    expect(siteUrl()).toBe('https://rr-abc123.vercel.app');
  });

  it('defaults to localhost in development', () => {
    clearEnv();
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
