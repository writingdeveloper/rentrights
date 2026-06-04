# SEO + AI SEO (GEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give RentRights complete technical SEO + AI-SEO (GEO): full metadata, robots/sitemap/icon/OG image, JSON-LD structured data, a visible AI-citable FAQ, and llms.txt — all from real/authoritative content and verifiable in raw HTML.

**Architecture:** Pure helpers in `lib/seo/` (base-URL resolver + JSON-LD builders, unit-tested). A tiny `<JsonLd>` renderer. A visible `<SeoFaq>` (client, SSR'd) rendering the FAQ + FAQPage schema from the same translated strings. `app/layout.tsx` emits full metadata + global JSON-LD; new `app/{robots,sitemap}.ts`, `app/icon.svg`, `app/opengraph-image.tsx`, and `public/llms.txt` cover the metadata routes. i18n keys in `messages/*` (parity-tested).

**Tech Stack:** Next.js 16 App Router (Metadata API, `MetadataRoute`, `next/og`), TypeScript, Vitest, Tailwind v4, the existing flat-key i18n (`translate`/`useT`).

**Spec:** `docs/superpowers/specs/2026-06-04-rentrights-seo-ai-seo-design.md`

**Next.js guides read (per AGENTS.md):** json-ld.md, robots.md, sitemap.md, opengraph-image.md, app-icons.md.

---

## File Structure

- **Create** `lib/seo/site-url.ts` — `siteUrl()` base-URL resolver (pure).
- **Create** `lib/seo/jsonld.ts` — `organizationJsonLd`/`webSiteJsonLd`/`webApplicationJsonLd`/`faqPageJsonLd` (pure builders).
- **Create** `components/JsonLd.tsx` — renders the scrubbed `<script type="application/ld+json">`.
- **Create** `components/SeoFaq.tsx` — visible FAQ section + FAQPage JSON-LD (`'use client'`, `useT`).
- **Modify** `app/layout.tsx` — full `generateMetadata` + global JSON-LD.
- **Modify** `app/page.tsx` — render `<SeoFaq />` at the end of `<main>`.
- **Create** `app/robots.ts`, `app/sitemap.ts`, `app/icon.svg`, `app/opengraph-image.tsx`.
- **Create** `public/llms.txt`.
- **Modify** `messages/en.json`, `messages/es.json` — `faq.*` + `meta.keywords`.
- **Create** `tests/seo/site-url.test.ts`, `tests/seo/jsonld.test.ts`.

---

## Task 1: Base-URL resolver `siteUrl()`

**Files:**
- Create: `lib/seo/site-url.ts`
- Test: `tests/seo/site-url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/seo/site-url.test.ts`
Expected: FAIL — `@/lib/seo/site-url` not found.

- [ ] **Step 3: Implement**

```ts
// lib/seo/site-url.ts
/**
 * Absolute site origin with no trailing slash. Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL          — explicit (self-host / production)
 *   2. https://VERCEL_PROJECT_PRODUCTION_URL — Vercel production domain
 *   3. https://VERCEL_URL            — Vercel preview deployment
 *   4. http://localhost:3000         — dev fallback
 * The app is portable (not Vercel-only), so this works on Vercel and self-host.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/seo/site-url.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/seo/site-url.ts tests/seo/site-url.test.ts
git commit -m "feat(seo): siteUrl base-URL resolver (env -> Vercel -> localhost)"
```

---

## Task 2: JSON-LD builders + `<JsonLd>` renderer

**Files:**
- Create: `lib/seo/jsonld.ts`
- Create: `components/JsonLd.tsx`
- Test: `tests/seo/jsonld.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  organizationJsonLd,
  webSiteJsonLd,
  webApplicationJsonLd,
  faqPageJsonLd,
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

  it('web application is a free utility', () => {
    const a = webApplicationJsonLd(BASE, 'en');
    expect(a['@type']).toBe('WebApplication');
    expect(a.applicationCategory).toBe('UtilitiesApplication');
    expect(a.isAccessibleForFree).toBe(true);
    expect(a.offers).toEqual({ '@type': 'Offer', price: 0, priceCurrency: 'USD' });
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/seo/jsonld.test.ts`
Expected: FAIL — `@/lib/seo/jsonld` not found.

- [ ] **Step 3: Implement the builders**

```ts
// lib/seo/jsonld.ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/seo/jsonld.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the `<JsonLd>` renderer**

```tsx
// components/JsonLd.tsx
// Renders structured data as a native <script>. Scrubs "<" to its unicode
// escape to prevent XSS via the JSON payload (per the Next.js JSON-LD guide).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/seo/jsonld.ts components/JsonLd.tsx tests/seo/jsonld.test.ts
git commit -m "feat(seo): JSON-LD builders (Org/WebSite/WebApplication/FAQPage) + JsonLd renderer"
```

---

## Task 3: i18n keys for the FAQ + keywords

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

> The FAQ answers cite only *stable* facts (1978 RSO cutoff, "once every 12 months", just-cause, the AB 1482 "5% + CPI, max 10%" statutory formula, the `LEGAL.notice` periods) and the `lastVerified` date — **no** time-varying percentages are hardcoded (those stay in the tool). New ES wording is Claude-authored and is routed to the legal-org sign-off track.

- [ ] **Step 1: Add the keys to `messages/en.json`**

Add these entries (anywhere in the object; JSON key order is irrelevant):

```json
"meta.keywords": "LA renter rights, Los Angeles rent control, RSO, AB 1482, rent increase cap, just cause eviction, tenant rights, rent stabilization",
"faq.heading": "Frequently asked questions",
"faq.intro": "RentRights is a free, open-source tool that estimates your rent-law protections in the City of Los Angeles (and unincorporated LA County) from your address — no sign-up, nothing stored. It is an estimate, not legal advice.",
"faq.q1": "What is LA's Rent Stabilization Ordinance (RSO)?",
"faq.a1": "The RSO is the City of Los Angeles's rent-control law. It generally covers rental units in buildings with a certificate of occupancy on or before October 1, 1978. RSO units get capped annual rent increases, \"just cause\" eviction protection, and possible relocation assistance.",
"faq.q2": "What is California's AB 1482 (the Tenant Protection Act)?",
"faq.a2": "AB 1482 is a statewide law that caps annual rent increases and requires \"just cause\" to evict after 12 months of tenancy. It applies to many units not covered by a stronger local law like the RSO; single-family homes and condos can be exempt if the owner gave the required written notice.",
"faq.q3": "How do I find out which protections apply to me?",
"faq.a3": "Enter your address in the tool above. RentRights checks public records (the LA County Assessor and the U.S. Census geocoder) to estimate whether the RSO, AB 1482, LA County's rent ordinance, or just-cause-only rules apply — then shows your annual rent-increase cap and key protections.",
"faq.q4": "How much can my landlord raise my rent?",
"faq.a4": "It depends on which law covers your unit. The RSO and local ordinances cap the annual increase at a percentage the housing authority publishes each year; AB 1482 caps it at 5% plus local inflation, up to a maximum of 10% per year. Use the rent-increase checker above for your unit's current cap, and confirm the exact figure with the housing authority.",
"faq.q5": "What does \"just cause\" eviction mean?",
"faq.a5": "\"Just cause\" means your landlord must have a legally valid reason to end your tenancy — such as nonpayment of rent or a lease violation — rather than evicting you for no reason. For certain no-fault reasons (like an owner move-in), you may be owed relocation assistance.",
"faq.q6": "Is RentRights legal advice?",
"faq.a6": "No. RentRights is a free estimate based on public records, not a lookup from the official rent registry, and it is not legal advice. Always confirm your status with the LA Housing Department (LAHD), LA County DCBA, or a tenant legal-aid organization before acting.",
"faq.q7": "How current is this information?",
"faq.a7": "Legal figures are dated and were last verified on {lastVerified}. Rent-cap percentages change (typically each summer), so always confirm the current numbers with the housing authority. Rent-increase notice periods are {small} days for increases of {threshold}% or less and {large} days for larger increases, plus {mail} extra days if the notice came by mail."
```

- [ ] **Step 2: Add the matching keys to `messages/es.json`**

```json
"meta.keywords": "derechos de inquilinos en Los Ángeles, control de renta, RSO, AB 1482, límite de aumento de renta, desalojo con causa justa, derechos del inquilino, estabilización de renta",
"faq.heading": "Preguntas frecuentes",
"faq.intro": "RentRights es una herramienta gratuita y de código abierto que estima tus protecciones de renta en la Ciudad de Los Ángeles (y el condado no incorporado de LA) a partir de tu dirección — sin registro y sin guardar nada. Es una estimación, no asesoría legal.",
"faq.q1": "¿Qué es la Ordenanza de Estabilización de Renta (RSO) de LA?",
"faq.a1": "La RSO es la ley de control de renta de la Ciudad de Los Ángeles. Generalmente cubre unidades de alquiler en edificios con certificado de ocupación emitido el 1 de octubre de 1978 o antes. Las unidades RSO tienen aumentos anuales de renta limitados, protección de desalojo con \"causa justa\" y posible asistencia de reubicación.",
"faq.q2": "¿Qué es la ley AB 1482 de California (Ley de Protección al Inquilino)?",
"faq.a2": "AB 1482 es una ley estatal que limita los aumentos anuales de renta y exige \"causa justa\" para desalojar después de 12 meses de arrendamiento. Aplica a muchas unidades no cubiertas por una ley local más fuerte como la RSO; las casas unifamiliares y los condominios pueden estar exentos si el propietario entregó el aviso escrito requerido.",
"faq.q3": "¿Cómo sé qué protecciones me corresponden?",
"faq.a3": "Ingresa tu dirección en la herramienta de arriba. RentRights consulta registros públicos (el Tasador del Condado de LA y el geocodificador del Censo de EE. UU.) para estimar si aplican la RSO, AB 1482, la ordenanza de renta del Condado de LA, o solo las reglas de causa justa — y luego muestra tu límite de aumento anual y tus protecciones clave.",
"faq.q4": "¿Cuánto puede subir mi renta el propietario?",
"faq.a4": "Depende de qué ley cubra tu unidad. La RSO y las ordenanzas locales limitan el aumento anual a un porcentaje que la autoridad de vivienda publica cada año; AB 1482 lo limita al 5% más la inflación local, hasta un máximo del 10% por año. Usa el verificador de aumentos de arriba para el límite actual de tu unidad y confirma la cifra exacta con la autoridad de vivienda.",
"faq.q5": "¿Qué significa desalojo con \"causa justa\"?",
"faq.a5": "\"Causa justa\" significa que el propietario debe tener una razón legalmente válida para terminar tu arrendamiento — como falta de pago o una violación del contrato — en lugar de desalojarte sin motivo. Por ciertas razones sin culpa (como que el dueño se mude), puede que te corresponda asistencia de reubicación.",
"faq.q6": "¿RentRights es asesoría legal?",
"faq.a6": "No. RentRights es una estimación gratuita basada en registros públicos, no una consulta al registro oficial de rentas, y no es asesoría legal. Confirma siempre tu situación con el Departamento de Vivienda de LA (LAHD), el DCBA del Condado de LA, o una organización de ayuda legal para inquilinos antes de actuar.",
"faq.q7": "¿Qué tan actualizada está esta información?",
"faq.a7": "Las cifras legales tienen fecha y se verificaron por última vez el {lastVerified}. Los porcentajes del límite de renta cambian (normalmente cada verano), así que confirma siempre las cifras actuales con la autoridad de vivienda. Los plazos de aviso de aumento son {small} días para aumentos del {threshold}% o menos y {large} días para aumentos mayores, más {mail} días adicionales si el aviso llegó por correo."
```

- [ ] **Step 3: Run the i18n tests to verify parity**

Run: `npx vitest run tests/i18n/`
Expected: PASS — the EN/ES catalogs have identical key sets (parity/coverage tests), including the new `faq.*` and `meta.keywords`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "i18n(seo): FAQ + keywords copy (EN/ES; new ES wording flagged for sign-off)"
```

---

## Task 4: Visible FAQ section + FAQPage schema; wire into the page

**Files:**
- Create: `components/SeoFaq.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/SeoFaq.tsx`**

```tsx
'use client';

import { useT } from '@/lib/i18n/LocaleProvider';
import { LEGAL } from '@/lib/legal/constants';
import { JsonLd } from './JsonLd';
import { faqPageJsonLd } from '@/lib/seo/jsonld';

const NOTICE_PARAMS = {
  small: LEGAL.notice.smallIncreaseDays,
  large: LEGAL.notice.largeIncreaseDays,
  threshold: LEGAL.notice.largeThresholdPct,
  mail: LEGAL.notice.mailExtraDays,
  lastVerified: LEGAL.lastVerified,
};

export function SeoFaq() {
  const t = useT();
  // Build the Q&A once; the SAME strings feed the visible list and the schema
  // so the FAQPage JSON-LD always matches what users (and AI crawlers) see.
  const faqs = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`, n === 7 ? NOTICE_PARAMS : undefined),
  }));

  return (
    <section aria-labelledby="faq-heading" className="mt-12 border-t pt-8">
      <p className="text-sm text-gray-600">{t('faq.intro')}</p>
      <h2 id="faq-heading" className="mt-6 text-lg font-bold">{t('faq.heading')}</h2>
      <dl className="mt-3 space-y-4">
        {faqs.map(({ q, a }, i) => (
          <div key={i}>
            <dt className="font-semibold text-gray-900">{q}</dt>
            <dd className="mt-1 text-sm text-gray-700">{a}</dd>
          </div>
        ))}
      </dl>
      <JsonLd data={faqPageJsonLd(faqs)} />
    </section>
  );
}
```

> `useT(key, params?)` is the existing hook (see `lib/i18n/LocaleProvider.tsx`); `t('faq.a7', NOTICE_PARAMS)` interpolates `{small}/{large}/{threshold}/{mail}/{lastVerified}` exactly as the `rights.*.point4` keys already do. The component is `'use client'`, but Next SSRs it, so the FAQ text **and** the JSON-LD land in the raw HTML for non-JS AI crawlers.

- [ ] **Step 2: Render it at the end of the page**

In `app/page.tsx`, add the import near the other component imports:

```tsx
import { SeoFaq } from '@/components/SeoFaq';
```

Then insert `<SeoFaq />` as the last child of `<main>`, immediately before the closing `</main>` (after the `{data && ( … )}` block):

```tsx
      )}
      <SeoFaq />
    </main>
  );
}
```

- [ ] **Step 3: Verify it builds and renders**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0.

(Visual + raw-HTML verification happens in the QA section.)

- [ ] **Step 4: Commit**

```bash
git add components/SeoFaq.tsx app/page.tsx
git commit -m "feat(seo): visible FAQ section + FAQPage JSON-LD on the landing page"
```

---

## Task 5: Full metadata + global JSON-LD in the layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Expand `generateMetadata` and render global JSON-LD**

Replace the imports + `generateMetadata` + `RootLayout` in `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pickInitialLocale } from '@/lib/i18n/detect';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';
import { siteUrl } from '@/lib/seo/site-url';
import { JsonLd } from '@/components/JsonLd';
import { organizationJsonLd, webSiteJsonLd, webApplicationJsonLd } from '@/lib/seo/jsonld';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

async function getLocale() {
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  const acceptLanguage = (await headers()).get('accept-language');
  return pickInitialLocale(cookieValue, acceptLanguage);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = CATALOG[locale];
  const title = translate(c, 'meta.title', undefined, CATALOG.en);
  const description = translate(c, 'meta.description', undefined, CATALOG.en);
  const keywords = translate(c, 'meta.keywords', undefined, CATALOG.en);
  const ogLocale = locale === 'es' ? 'es_ES' : 'en_US';
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: '%s · RentRights' },
    description,
    applicationName: 'RentRights',
    keywords: keywords.split(',').map((k) => k.trim()),
    category: 'reference',
    authors: [{ name: 'RentRights' }],
    creator: 'RentRights',
    publisher: 'RentRights',
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: 'RentRights',
      title,
      description,
      locale: ogLocale,
      alternateLocale: ogLocale === 'es_ES' ? 'en_US' : 'es_ES',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const base = siteUrl();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationJsonLd(base)} />
        <JsonLd data={webSiteJsonLd(base, locale)} />
        <JsonLd data={webApplicationJsonLd(base, locale)} />
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
```

> `metadataBase` lets the `app/opengraph-image.tsx` file convention (Task 7) auto-inject an absolute `og:image`; `alternates.canonical: '/'` resolves against it. Twitter cards fall back to `og:image` when no `twitter-image` is present, so no duplicate image file is needed.

- [ ] **Step 2: Verify typecheck + build**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(seo): complete metadata (canonical/OG/Twitter/robots) + global JSON-LD"
```

---

## Task 6: robots.txt + sitemap.xml route handlers

**Files:**
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: Create `app/robots.ts`**

```ts
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
```

- [ ] **Step 2: Create `app/sitemap.ts`**

```ts
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
```

- [ ] **Step 3: Verify build emits both**

Run: `npm run build`
Expected: exit 0; the route list includes `/robots.txt` and `/sitemap.xml`.

- [ ] **Step 4: Commit**

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "feat(seo): robots.txt (allow AI crawlers) + sitemap.xml"
```

---

## Task 7: Favicon + generated Open Graph image

**Files:**
- Create: `app/icon.svg`
- Create: `app/opengraph-image.tsx`

- [ ] **Step 1: Create `app/icon.svg`** (served automatically as the favicon)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1d4ed8"/>
  <path d="M16 6 L26 14 V26 H20 V19 H12 V26 H6 V14 Z" fill="#ffffff"/>
</svg>
```

- [ ] **Step 2: Create `app/opengraph-image.tsx`** (1200×630 social card via `next/og`)

```tsx
import { ImageResponse } from 'next/og';

export const alt = 'RentRights — Know your LA renter rights, free';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, color: '#60a5fa' }}>RentRights</div>
        <div style={{ fontSize: 44, marginTop: 24, lineHeight: 1.25 }}>
          Know your Los Angeles renter rights — free, no sign-up.
        </div>
        <div style={{ fontSize: 28, marginTop: 32, color: '#9ca3af' }}>
          RSO · AB 1482 · LA County rent caps · just-cause eviction
        </div>
      </div>
    ),
    { ...size },
  );
}
```

> No custom font is loaded — `next/og` renders the basic Latin text with its built-in font. If `npm run build` reports a font error, add a `fonts` option per `opengraph-image.md`.

- [ ] **Step 3: Verify build emits the icon + OG image**

Run: `npm run build`
Expected: exit 0; routes include `/icon.svg` and `/opengraph-image`.

- [ ] **Step 4: Commit**

```bash
git add app/icon.svg app/opengraph-image.tsx
git commit -m "feat(seo): branded favicon + generated Open Graph social card"
```

---

## Task 8: llms.txt + final verification gate

**Files:**
- Create: `public/llms.txt`

- [ ] **Step 1: Create `public/llms.txt`**

```text
# RentRights

> RentRights is a free, open-source web tool that estimates a renter's rent-law
> protections in the City of Los Angeles and unincorporated Los Angeles County
> from a street address. It is an estimate based on public records, not legal advice.

## What it does
- Takes an LA address and estimates which rent law applies: the City of LA Rent
  Stabilization Ordinance (RSO), California's AB 1482 statewide cap, LA County's
  rent ordinance (RSTPO), or just-cause-only protections.
- Shows the current annual rent-increase cap and the renter's key protections
  (rent caps, "just cause" eviction, relocation assistance, notice periods).
- Free, no sign-up, nothing stored.

## Key facts
- RSO generally covers buildings with a certificate of occupancy on or before
  October 1, 1978.
- AB 1482 caps annual increases at 5% plus local inflation (maximum 10%/year) and
  requires just cause after 12 months; single-family homes/condos may be exempt
  with the required written notice.
- Data sources: LA County Assessor (CAMS geocoder + parcel records) and the U.S.
  Census geocoder; legal figures are dated and verified constants.

## Important
- This is an estimate, not legal advice or an official registry lookup.
- Confirm any result with the LA Housing Department (LAHD), LA County DCBA, or a
  tenant legal-aid organization before acting.
```

- [ ] **Step 2: Full verification gate**

Run: `npx tsc --noEmit` → exit 0
Run: `npm run lint` → exit 0
Run: `npm test` → all pass (incl. new `tests/seo/*` + i18n parity)
Run: `npm run build` → exit 0 (emits `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/opengraph-image`)

- [ ] **Step 3: Commit**

```bash
git add public/llms.txt
git commit -m "feat(seo): llms.txt summary for AI crawlers"
```

---

## Manual QA (Chrome, both locales — per the always-perfect-QA constraint; performed in-session by the operator)

1. `npm run build && npx next start -p 3005`.
2. Load `http://localhost:3005/`. Use `get_page_text` / network / view-source to confirm the **raw HTML** contains: `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`/`og:description`/`og:image`/`og:type`/`og:locale`, `twitter:card`, `<link rel="icon">`, and **three** layout JSON-LD `<script type="application/ld+json">` blocks (Organization, WebSite, WebApplication) plus the FAQPage block.
3. Scroll: confirm the FAQ section renders visibly (intro + 7 Q&A). Switch to **Español**; confirm the FAQ + `<title>`/description are translated and `<html lang="es">`.
4. Load `/robots.txt` (lists `*` + AI bots + Sitemap), `/sitemap.xml` (home URL), `/opengraph-image` (1200×630 card renders), `/llms.txt` (200, readable). `/icon.svg` resolves (favicon shows in the tab).
5. Confirm the address tool still works (run a lookup) — no regression from the page change.
6. Note for the operator: validate JSON-LD post-deploy with Google's Rich Results Test and the Schema Markup Validator.
7. Stop the server; leave the operator's port 3000 app alone.
