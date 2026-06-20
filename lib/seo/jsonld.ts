type Json = Record<string, unknown>;

export function organizationJsonLd(base: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}#org`,
    name: 'RentRights',
    url: `${base}/`,
    description: 'Free, open-source tool estimating Los Angeles rent-law protections by address.',
    areaServed: { '@type': 'AdministrativeArea', name: 'Los Angeles, California' },
  };
}

export function webSiteJsonLd(base: string, locale: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}#website`,
    url: `${base}/`,
    name: 'RentRights',
    description: 'Estimate your LA renter rights and rent-increase cap from your address.',
    inLanguage: locale,
    publisher: { '@id': `${base}#org` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/?address={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function webApplicationJsonLd(base: string, locale: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'RentRights',
    url: `${base}/`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    description: 'Check whether the RSO, AB 1482, or LA County rules cap your rent — and your eviction protections.',
    inLanguage: locale,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqPageJsonLd(faqs: FaqItem[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
