import { describe, it, expect } from 'vitest';
import {
  organizationJsonLd,
  webSiteJsonLd,
  webApplicationJsonLd,
  faqPageJsonLd,
  articleJsonLd,
} from '@/lib/seo/jsonld';

const BASE = 'https://rentrights.org';

describe('jsonld builders', () => {
  it('organization has @context/@type/@id and url', () => {
    const o = organizationJsonLd(BASE);
    expect(o['@context']).toBe('https://schema.org');
    expect(o['@type']).toBe('Organization');
    expect(o['@id']).toBe(`${BASE}#org`);
    expect(o.url).toBe(`${BASE}/`);
  });

  it('website links to the org as publisher and carries the locale', () => {
    const w = webSiteJsonLd(BASE, 'es');
    expect(w['@type']).toBe('WebSite');
    expect(w.inLanguage).toBe('es');
    expect(w.publisher).toEqual({ '@id': `${BASE}#org` });
  });

  it('website has a SearchAction potentialAction for address lookup', () => {
    const w = webSiteJsonLd(BASE, 'en');
    const action = w.potentialAction as Record<string, unknown>;
    expect(action['@type']).toBe('SearchAction');
    const target = action.target as Record<string, unknown>;
    expect(target['@type']).toBe('EntryPoint');
    expect(typeof target.urlTemplate).toBe('string');
    expect((target.urlTemplate as string).includes('{search_term_string}')).toBe(true);
    expect(action['query-input']).toBe('required name=search_term_string');
  });

  it('web application is a free utility', () => {
    const a = webApplicationJsonLd(BASE, 'en');
    expect(a['@type']).toBe('WebApplication');
    expect(a.applicationCategory).toBe('UtilitiesApplication');
    expect(a.isAccessibleForFree).toBe(true);
    expect(a.offers).toEqual({ '@type': 'Offer', price: 0, priceCurrency: 'USD' });
  });

  it('article carries dated modified/published and links the org as author + publisher', () => {
    const a = articleJsonLd({
      base: BASE,
      url: `${BASE}/guides/g`,
      headline: 'H',
      description: 'D',
      dateModified: '2026-06-19',
    });
    expect(a['@type']).toBe('Article');
    expect(a.headline).toBe('H');
    expect(a.dateModified).toBe('2026-06-19');
    expect(a.datePublished).toBe('2026-06-19');
    expect(a.author).toEqual({ '@id': `${BASE}#org` });
    expect(a.publisher).toEqual({ '@id': `${BASE}#org` });
  });

  it('faqPage maps each {q,a} to a Question/Answer, preserving count', () => {
    const faqs = [
      { q: 'Q1', a: 'A1' },
      { q: 'Q2', a: 'A2' },
    ];
    const f = faqPageJsonLd(faqs);
    expect(f['@type']).toBe('FAQPage');
    const main = f.mainEntity as Array<Record<string, unknown>>;
    expect(main).toHaveLength(2);
    expect(main[0]).toEqual({
      '@type': 'Question',
      name: 'Q1',
      acceptedAnswer: { '@type': 'Answer', text: 'A1' },
    });
  });
});
