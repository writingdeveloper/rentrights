# SEO + AI SEO (GEO) for RentRights — design

- **Date:** 2026-06-04
- **Status:** Approved (design), pending implementation plan
- **Area:** `app/layout.tsx`, `app/page.tsx`, new `app/` metadata routes, new `components/` + `lib/seo/`, `messages/*`, `public/llms.txt`

## Goal & success criteria

Make RentRights fully optimized for both classic search engines and AI answer engines (ChatGPT/Perplexity/Gemini/Claude/Google AI), using only **real, authoritative** content:

- Complete, valid metadata (title/description/canonical/OpenGraph/Twitter/robots) on the page, locale-aware.
- Crawlable `robots.txt` (allowing AI crawlers), `sitemap.xml`, favicon, and a generated social card.
- Valid JSON-LD structured data (Organization, WebSite, WebApplication, FAQPage) that **matches visible on-page content** (2026 best practice — Google penalizes invisible schema).
- A visible, factual, **AI-citable** FAQ/explainer section (the GEO win), EN + ES, sourced from already-reviewed copy + dated `LEGAL` constants.
- `llms.txt` for AI crawlers.
- All verifiable in the raw server-rendered HTML (so non-JS AI crawlers see it) and via Chrome QA in both locales.

Research basis (2026): structured data is the top lever for AI visibility; schema must match visible content; foundational technical SEO underpins AI visibility; AI engines cite clear, factual, extractable content; `llms.txt` is low-cost (Google ignores it, some AI tools cite it). Sources: Google AI optimization guide; JSON-LD/GEO 2026 guides; llms.txt reports.

## Deployment portability (reviewed)

RentRights is **not** Vercel-only — it uses only portable Next.js 16 features (App Router, `runtime='nodejs'` handlers, `next/font`, external `fetch`; no Vercel KV/Blob/Edge Config). It deploys on Vercel zero-config **and** self-hosts (the M3-C Docker plan). Base URL therefore resolves in `lib/seo/site-url.ts`:

```
NEXT_PUBLIC_SITE_URL  (self-host / explicit)        e.g. https://rentrights.org
  → https://${VERCEL_PROJECT_PRODUCTION_URL}        (auto on Vercel production)
  → https://${VERCEL_URL}                           (auto on Vercel preview)
  → http://localhost:3000                           (dev fallback)
```

This uses the Vercel address automatically when on Vercel, and an env-set domain when self-hosted.

## Architecture / components

### `lib/seo/site-url.ts`
- `siteUrl(): string` — the base-URL resolver above (pure, reads `process.env`). Always returns an absolute origin with no trailing slash.

### `lib/seo/jsonld.ts` (pure builders, unit-tested)
- `organizationJsonLd(base)` → `Organization` (name, url, `@id` `${base}#org`, description, logo, areaServed "Los Angeles", `sameAs` []).
- `webSiteJsonLd(base, locale)` → `WebSite` (`@id` `${base}#website`, url, name, description, inLanguage, publisher → `{ '@id': '${base}#org' }`).
- `webApplicationJsonLd(base, locale)` → `WebApplication` (name, url, `applicationCategory: 'UtilitiesApplication'`, `offers` price 0 USD (free), operatingSystem "Web", browserRequirements "Requires JavaScript", description, inLanguage, `isAccessibleForFree: true`).
- `faqPageJsonLd(faqs)` → `FAQPage` with `mainEntity` = `[{ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }]`, built from the SAME `{q,a}` array the visible FAQ renders.
- Builders return plain objects (no `@context` injection — see JsonLd component); a small helper attaches `@context: 'https://schema.org'` when serialized, OR each top-level builder includes it. **Decision:** each builder includes `'@context': 'https://schema.org'` so it can be rendered standalone.

### `components/JsonLd.tsx`
- `<JsonLd data={obj} />` → renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />` (XSS scrub per Next.js JSON-LD guide). Usable from server and (SSR'd) client components.

### `components/SeoFaq.tsx` (`'use client'`, uses `useT`)
- A styled, always-visible FAQ/explainer section rendered at the bottom of the page. Renders:
  - A short intro paragraph (what RentRights does — reuses the existing tagline tone).
  - ~7 Q&A as visible blocks (semantic `<h2>` section heading, each Q an `<h3>`, each A a `<p>`; expanded/visible, not hidden), from i18n keys `faq.*`.
  - `<JsonLd data={faqPageJsonLd(faqs)} />` built from the SAME translated `{q,a}` pairs → schema matches visible content.
- FAQ items (concise, factual; reuse reviewed wording; figures from `LEGAL`):
  1. What is LA's Rent Stabilization Ordinance (RSO)?
  2. What is California AB 1482 (statewide rent cap & just cause)?
  3. How do I find out which protections apply to me? (→ use the tool above)
  4. How much can my rent legally increase? (RSO cap + AB1482 formula from `LEGAL`, with "confirm with your housing authority")
  5. What does "just cause" eviction mean?
  6. Is RentRights legal advice? (No — free estimate; confirm with LAHD/DCBA or legal aid.)
  7. How current is this information? (`LEGAL.lastVerified`; figures change — verify with the authority.)

### `app/layout.tsx` (modify)
- Expand `generateMetadata` (locale-aware): `metadataBase = new URL(siteUrl())`; `title` (default + `template` `'%s · RentRights'`); `description`; `applicationName`; `alternates: { canonical: '/' }`; `openGraph` `{ type: 'website', url: '/', siteName, title, description, locale: ogLocale, alternateLocale, images: ['/opengraph-image'] (auto via convention) }`; `twitter: { card: 'summary_large_image', title, description }`; `robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } }`; `keywords`; `category: 'reference'`; `authors`/`creator`/`publisher`.
- Render global JSON-LD in `<body>` (or `<head>` via component): `<JsonLd data={organizationJsonLd(base)} />`, `webSiteJsonLd`, `webApplicationJsonLd` (server-rendered).
- `<html lang>` already locale-synced (unchanged).

### `app/page.tsx` (modify)
- Render the existing tool unchanged, then `<SeoFaq />` at the bottom (always visible). Page stays `'use client'`; the FAQ is SSR'd into the raw HTML (crawlable by non-JS AI bots). JSON-LD inside `SeoFaq` is likewise SSR'd.

### `app/robots.ts` (new)
- `MetadataRoute.Robots`: rule `{ userAgent: '*', allow: '/' }`; explicit allow rules for AI crawlers (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`, `ClaudeBot`, `Claude-SearchBot`, `Google-Extended`, `Applebot-Extended`, `Bingbot`) each `allow: '/'`; `sitemap: ${base}/sitemap.xml`; `host: base`.

### `app/sitemap.ts` (new)
- `MetadataRoute.Sitemap`: single entry `{ url: base + '/', lastModified: new Date(LEGAL.lastVerified), changeFrequency: 'monthly', priority: 1 }`. (`Date.now()` is unavailable in this env only inside Workflow scripts — route handlers run normally, so `new Date(...)` is fine here.)

### `app/icon.svg` (new)
- A small, clean branded favicon (e.g., a house outline with a check/shield, RentRights blue `#1d4ed8`). Served automatically as `<link rel="icon">`.

### `app/opengraph-image.tsx` (new)
- `next/og` `ImageResponse`, 1200×630, dark background, "RentRights", tagline "Know your LA renter rights — free, no sign-up", and a small house mark. Exported `size`/`contentType` per the convention. Also used as the Twitter image.

### `public/llms.txt` (new)
- Markdown: `# RentRights`, one-line summary, "What it does", key facts (free, no sign-up, LA City + unincorporated LA County, regimes: RSO/AB1482/County RSTPO/just cause), data sources (LA County CAMS/PAIS/Assessor, Census; dated `LEGAL` constants), "It is a free estimate, not legal advice", and the canonical URL. Authored to be safely static (no per-deploy URL hardcoding beyond a note).

### i18n (`messages/en.json`, `messages/es.json`)
- New keys: `meta.*` (title/description already exist — extend with `meta.ogTitle`/`meta.keywords` if needed), `og.*`, `faq.intro`, `faq.q1..q7`, `faq.a1..a7`. The catalog parity test enforces EN/ES key parity. **New ES legal wording is routed to the legal-org sign-off track** (per [[rentrights-gethelp-needs-legal-signoff]]).

## Data flow

Request → `layout.generateMetadata` (locale from cookie/Accept-Language) emits all meta tags + `metadataBase`; `layout` renders global JSON-LD; `page` renders the tool + `SeoFaq` (visible FAQ + FAQPage JSON-LD). `robots.ts`/`sitemap.ts`/`icon.svg`/`opengraph-image.tsx` are served at their conventional routes. All absolute URLs derive from `siteUrl()`.

## Error handling / edge cases

- `siteUrl()` always returns a valid origin (localhost fallback) → `new URL()` never throws.
- JSON-LD content is from our own CATALOG/LEGAL (not user input); still XSS-scrubbed per the Next guide.
- Missing/!set env in dev → localhost base (fine for QA; production sets env or runs on Vercel).
- FAQ content is always rendered (not gated on a lookup) → always in HTML.

## Testing

- `lib/seo/site-url.ts`: unit tests — env precedence (NEXT_PUBLIC_SITE_URL > VERCEL_PROJECT_PRODUCTION_URL > VERCEL_URL > localhost), trailing-slash stripped, https prefix added for Vercel vars.
- `lib/seo/jsonld.ts`: unit tests — each builder returns the right `@type` + required fields + `@context`; `faqPageJsonLd` maps `{q,a}` → Question/Answer correctly and preserves count.
- i18n parity test (existing) covers the new `faq.*`/`og.*` keys.
- `tsc` 0 · `lint` 0 · `npm test` green · `npm run build` 0 (build must emit `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/opengraph-image`).

## QA (Chrome, both locales — per the always-perfect-QA constraint)

1. Load `/`; via `get_page_text`/network or `view-source`, confirm in the **raw HTML**: `<title>`, `<meta name="description">`, canonical, `og:*`, `twitter:*`, `<link rel="icon">`, and the JSON-LD `<script>`s (Organization, WebSite, WebApplication, FAQPage).
2. Confirm the FAQ section renders visibly; switch to Español and confirm FAQ + meta are translated.
3. Load `/robots.txt`, `/sitemap.xml`, `/opengraph-image` (image renders), `/llms.txt` — all 200 and correct.
4. Validate JSON-LD structure (shape/required fields; optionally note the Google Rich Results Test URL for the user to run post-deploy).
5. Confirm the tool itself still works (a lookup) and nothing regressed.

## Out of scope / follow-ups

- Per-locale URLs + full hreflang link alternates (chose canonical + OG-locale; single-URL negotiated site). Future enhancement if locale-path routing is added.
- New ES legal copy → legal-org sign-off track.
- Actual deployment (Vercel or self-host M3-C) and setting the production `NEXT_PUBLIC_SITE_URL`.
- Google Search Console / Bing verification meta tags (added at deploy when the property is claimed).

## Verification gate

`tsc` 0 · `lint` 0 · `test` green · `build` 0 (emits robots/sitemap/icon/og) · CI green on the PR · Chrome QA confirms raw-HTML meta + JSON-LD + FAQ in EN & ES + the metadata routes serve.
