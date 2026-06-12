import { describe, it, expect } from 'vitest';
import { pageAlternates } from '@/lib/seo/alternates';

describe('pageAlternates', () => {
  it('canonicalizes the default (English) path to "/" with full hreflang set', () => {
    const a = pageAlternates(false);
    expect(a.canonical).toBe('/');
    expect(a.languages).toEqual({ en: '/', es: '/es', 'x-default': '/' });
  });

  it('canonicalizes the Spanish path to "/es" with the same hreflang set', () => {
    const a = pageAlternates(true);
    expect(a.canonical).toBe('/es');
    expect(a.languages).toEqual({ en: '/', es: '/es', 'x-default': '/' });
  });
});
