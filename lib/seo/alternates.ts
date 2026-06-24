// Canonical + hreflang for the home page, keyed by which URL is being served.
// English (and any negotiated rendering) lives at "/" and is x-default; Spanish
// has its own crawlable URL at "/es" so Googlebot (which crawls as en-US and
// would otherwise never see the Spanish copy) can index it. Both URLs advertise
// the same hreflang cluster. Paths are resolved against metadataBase by Next.
export function pageAlternates(isEsPath: boolean): {
  canonical: string;
  languages: Record<string, string>;
} {
  return {
    canonical: isEsPath ? '/es' : '/',
    languages: { en: '/', es: '/es', 'x-default': '/' },
  };
}

// Same pattern for the cornerstone guide: EN at /guides/<slug>, ES at /es/guides/<slug>.
export function cornerstoneAlternates(isEsPath: boolean): {
  canonical: string;
  languages: Record<string, string>;
} {
  const en = '/guides/la-rent-increase-2026';
  const es = '/es/guides/la-rent-increase-2026';
  return {
    canonical: isEsPath ? es : en,
    languages: { en, es, 'x-default': en },
  };
}
