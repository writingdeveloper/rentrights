# RentRights Marketing Wave-1 (Build Track) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the safe-now, contactless, compounding marketing assets — a client-side shareable Result Card image, a cornerstone SEO/GEO explainer page, and an OG verification — so RentRights spreads peer-to-peer and ranks/gets-cited for "is my LA rent increase legal" queries.

**Architecture:** Reuse existing patterns: dated `LEGAL` constants for every figure, the `JsonLd` + `faqPageJsonLd` schema pattern, the cookie/header locale (`getLocale`) for the page, the brand tokens + Fraunces for the card. The share card is 100% client-side (no PII, nothing saved). The cornerstone is a statically-rendered server route. No legal figure/contact/routing change.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, `html-to-image` (new, for the card PNG), Vitest, Playwright + axe.

**Branch:** `feat/marketing-wave1` (already created; marketing docs committed).

---

## File Structure

- `lib/share/cardData.ts` — **Create.** Pure helper: from a `RegimeResult` + `now`, derive the card's display fields (title, plain-line, cap label, "as of" date, whether covered) — unit-testable, no React. Reuses `rightsText`/`capLabel`/`capPeriodFor`.
- `components/ShareCard.tsx` — **Create.** The hidden, fixed-size (1080×1350) branded card DOM, styled with brand tokens + Fraunces, rendered off-screen; consumes `cardData` + locale strings.
- `components/ShareImageButton.tsx` — **Create.** Button under the result that renders `ShareCard` to PNG via `html-to-image` and triggers a download. Client-only.
- `app/page.tsx` — **Modify.** Mount `ShareImageButton` in the result band (near `ShareButton`).
- `lib/seo/jsonld.ts` — **Modify.** Add `articleJsonLd(...)` builder.
- `lib/seo/cornerstone.ts` — **Create.** Pure helper producing the cornerstone's dated 3-regime rows + the FAQ Q&A array from `LEGAL` (so the visible table, the prose, and the JSON-LD share one source). Unit-testable.
- `app/guides/la-rent-increase-2026/page.tsx` — **Create.** The cornerstone server page (EN), with `metadata`, visible content, table, CTA, FAQ + Article JSON-LD.
- `app/sitemap.ts` — **Modify.** Add the new guide URL.
- `messages/en.json` / `messages/es.json` — **Modify.** Add the few card strings (EN+ES parity). Cornerstone prose is EN-authored in the page (ES mirror is Wave 2).
- Tests: `tests/share/cardData.test.ts`, `tests/seo/cornerstone.test.ts`, `tests/seo/jsonld.test.ts` (extend), `e2e/share-image.spec.ts`, `e2e/cornerstone.spec.ts`.

---

## Task 1 — OG / link-preview verification (quick)

**Files:** inspect `app/opengraph-image.tsx`, `app/twitter-image.tsx`, `app/layout.tsx` metadata.

- [ ] **Step 1:** Confirm `opengraph-image.tsx` is 1200×630 (it is), Justice-Green branded, with clear alt. Confirm `twitter.card = 'summary_large_image'` (it is) and `meta.title`/`meta.description` read trustworthy.
- [ ] **Step 2:** Build and check the generated OG PNG weight is < ~300KB (next/og at 1200×630 is typically < 100KB). Run `npm run build` and load `/opengraph-image` locally.
- [ ] **Step 3:** Only if a gap is found, tighten copy. Expected: no change needed — OG already meets the bar. Document the verification in the commit message.

*(No code change expected; this is a verification gate so the link preview is trustworthy when pasted into iMessage/WhatsApp/Reddit.)*

---

## Task 2 — Share Result Card data helper (TDD, pure)

**Files:** Create `lib/share/cardData.ts`; Test `tests/share/cardData.test.ts`.

The card shows: regime title, plain "what this means" line, the cap label (e.g. "up to 3%"), an "as of <date>" stamp, and whether it's covered. All from existing helpers so a forwarded card can't go stale-wrong.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { shareCardData } from '@/lib/share/cardData';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';
import { RegimeResult } from '@/lib/rules/types';

const t = (k: string, p?: Record<string, string | number>) => translate(CATALOG.en, k, p, CATALOG.en);
const rso: RegimeResult = { regime: 'RSO', confidence: 'high', reasons: [], questions: [] };

describe('shareCardData', () => {
  it('builds RSO card fields with the dated cap and as-of date', () => {
    const d = shareCardData(rso, t, '2026-06-19', new Date('2026-06-22'), 'en');
    expect(d.title).toContain('Rent Stabilization');
    expect(d.capLabel).toBe('up to 3%');
    expect(d.covered).toBe(true);
    expect(d.asOf).toContain('2026'); // formatted "June 19, 2026"
    expect(d.plain.toLowerCase()).toContain('in plain terms');
  });
  it('marks out-of-jurisdiction as not covered with no cap label', () => {
    const ooj: RegimeResult = { regime: 'OUT_OF_JURISDICTION', confidence: 'low', reasons: [], questions: [] };
    const d = shareCardData(ooj, t, '2026-06-19', new Date('2026-06-22'), 'en');
    expect(d.covered).toBe(false);
    expect(d.capLabel).toBeNull();
  });
});
```

- [ ] **Step 2: Run → fail** `npx vitest run tests/share/cardData.test.ts` (module not found).

- [ ] **Step 3: Implement**

```ts
import { Regime, RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, isCovered } from '@/lib/content/rights';
import { formatDate } from '@/lib/format/date';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ShareCardData {
  title: string;
  plain: string;
  capLabel: string | null;
  covered: boolean;
  asOf: string;
}

const DETAILED = (r: Regime) => r !== 'OUT_OF_JURISDICTION' && r !== 'UNKNOWN';

export function shareCardData(
  result: RegimeResult,
  t: T,
  lastVerified: string,
  now: Date,
  locale: 'en' | 'es',
): ShareCardData {
  const covered = isCovered(result.regime);
  return {
    title: rightsText(result.regime, t).title,
    plain: DETAILED(result.regime) ? t(`rights.${result.regime}.plain`) : '',
    capLabel: DETAILED(result.regime) ? capLabel(result.regime, t, now) : null,
    covered,
    asOf: formatDate(lastVerified, locale),
  };
}
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(share): card data helper`.

---

## Task 3 — Share Card component + image button

**Files:** Create `components/ShareCard.tsx`, `components/ShareImageButton.tsx`; Modify `app/page.tsx`, `messages/en.json`, `messages/es.json`, `package.json` (add `html-to-image`). e2e `e2e/share-image.spec.ts`.

- [ ] **Step 1:** Add dep: `npm i html-to-image` (small, MIT; renders the styled DOM with real fonts → PNG, far more reliable than manual canvas for Fraunces). Verify `npm ls html-to-image`.

- [ ] **Step 2:** Add card strings to en.json + es.json (parity):
  - `share.cardCovered` EN "Protected under" / ES "Protegido por"
  - `share.cardNotCovered` EN "Your LA rent rights" / ES "Sus derechos de renta en LA"
  - `share.cardCapLabel` EN "Legal annual increase" / ES "Aumento legal anual"
  - `share.cardAsOf` EN "As of {date}" / ES "Al {date}"
  - `share.cardDisclaimer` EN "Estimate, not legal advice — confirm with your housing authority." / ES "Estimación, no asesoría legal — confírmelo con su autoridad de vivienda."
  - `share.saveImage` EN "Save shareable image" / ES "Guardar imagen para compartir"

- [ ] **Step 3:** `components/ShareCard.tsx` — a `forwardRef` div, fixed 1080×1350, brand tokens (cream bg `#F6F4EF`, deep-green `#1F6B4A`, ink), Fraunces for title/cap via `font-display`, Wordmark, the `share.card*` strings + `cardData` fields, the URL `rentrights.writingdeveloper.blog`, and the disclaimer. Rendered off-screen (`position:fixed; left:-9999px; top:0`) so it's in the DOM for html-to-image but invisible.

- [ ] **Step 4:** `components/ShareImageButton.tsx` — `'use client'`; holds a ref to `ShareCard`; on click `await document.fonts.ready; const png = await toPng(ref.current, { pixelRatio: 1, cacheBust: true }); ` then create an `<a download="rentrights-la.png" href={png}>` and click it. Guard against double-clicks; no network, nothing stored. Label = `share.saveImage`.

- [ ] **Step 5:** Mount in `app/page.tsx` Band-3 next to `ShareButton`, passing `result`, `lastVerified`. Only render when `isCovered || detailed` (i.e., there is a verdict worth sharing).

- [ ] **Step 6:** e2e `e2e/share-image.spec.ts` (RSO address): click "Save shareable image", assert a download is triggered (`page.waitForEvent('download')`) and the suggested filename matches `/rentrights.*\.png/`.

- [ ] **Step 7:** Gate (tsc+lint+test+build) + run e2e + axe. Commit `feat(share): client-side shareable result-card PNG (EN/ES, nothing saved)`.

---

## Task 4 — Article JSON-LD builder (TDD, pure)

**Files:** Modify `lib/seo/jsonld.ts`; Test `tests/seo/jsonld.test.ts` (extend).

- [ ] **Step 1: Failing test**

```ts
import { articleJsonLd } from '@/lib/seo/jsonld';
it('builds Article JSON-LD with dated modified + author org', () => {
  const a = articleJsonLd({ base: 'https://x.test', url: 'https://x.test/guides/g', headline: 'H', description: 'D', dateModified: '2026-06-19' });
  expect(a['@type']).toBe('Article');
  expect(a.dateModified).toBe('2026-06-19');
  expect((a.publisher as Record<string, unknown>)['@id']).toBe('https://x.test#org');
});
```

- [ ] **Step 2: Implement** (append to jsonld.ts):

```ts
export function articleJsonLd(o: { base: string; url: string; headline: string; description: string; dateModified: string }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: o.headline,
    description: o.description,
    mainEntityOfPage: o.url,
    inLanguage: 'en',
    dateModified: o.dateModified,
    datePublished: o.dateModified,
    author: { '@id': `${o.base}#org` },
    publisher: { '@id': `${o.base}#org` },
  };
}
```

- [ ] **Step 3: Run → pass. Commit** `feat(seo): Article JSON-LD builder`.

---

## Task 5 — Cornerstone content helper (TDD, pure)

**Files:** Create `lib/seo/cornerstone.ts`; Test `tests/seo/cornerstone.test.ts`.

Produces the dated regime rows + FAQ Q&A from `LEGAL`, so visible content and schema share one source. EN strings live here (page is EN-first).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { cornerstoneRows, cornerstoneFaqs } from '@/lib/seo/cornerstone';

describe('cornerstone content', () => {
  it('rows carry the current dated cap per regime', () => {
    const rows = cornerstoneRows(new Date('2026-06-22'));
    const rso = rows.find((r) => r.key === 'RSO')!;
    expect(rso.cap).toContain('3%');
    expect(rso.effective).toContain('2026'); // effective window
  });
  it('faqs are non-empty Q/A pairs', () => {
    const f = cornerstoneFaqs(new Date('2026-06-22'));
    expect(f.length).toBeGreaterThanOrEqual(4);
    expect(f[0].q.length).toBeGreaterThan(0);
    expect(f[0].a.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement** `cornerstoneRows(now)` (selectDated over `LEGAL.rsoCapPct`/`ab1482CapPct`/`countyCapPct`, formatting the value or pending range + the effective window + source) and `cornerstoneFaqs(now)` (4–6 EN Q&A built from the rows + notice rules, each answer-first 40–60 words). All figures from `LEGAL`; keep `value:null` → "pending (publishes ~July 1)". No fabricated numbers.

- [ ] **Step 3: Run → pass. Commit** `feat(seo): cornerstone content helper from dated LEGAL constants`.

---

## Task 6 — Cornerstone page

**Files:** Create `app/guides/la-rent-increase-2026/page.tsx`; Modify `app/sitemap.ts`. e2e `e2e/cornerstone.spec.ts`.

- [ ] **Step 1:** Server component page (EN). `export const metadata` = title "How much can my landlord raise my rent in Los Angeles? (2026)", description (answer-first), canonical `/guides/la-rent-increase-2026`. Content: answer-first H1 + 40–60 word lede, the dated 3-regime `<table>` (from `cornerstoneRows`), question-shaped H2s with `cornerstoneFaqs` answers, a prominent `<Link href="/">Check your address →</Link>` CTA, primary-source citations (LAHD/DCBA/CA AG links), and an "information, not legal advice — confirm with LAHD/DCBA" line. Render `<JsonLd data={articleJsonLd(...)} />` and `<JsonLd data={faqPageJsonLd(cornerstoneFaqs(now))} />`.

- [ ] **Step 2:** Add the URL to `app/sitemap.ts`.

- [ ] **Step 3:** e2e `e2e/cornerstone.spec.ts`: navigate `/guides/la-rent-increase-2026`; assert the H1, the cap table contains "3%", the CTA links to `/`, and an Article + FAQPage `<script type="application/ld+json">` are present.

- [ ] **Step 4:** Gate + e2e + axe (the page must pass axe). Commit `feat(seo): cornerstone "LA rent increase 2026" explainer page`.

---

## Final: full gate + Chrome QA + finish

- [ ] Full gate green: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`.
- [ ] e2e + axe on `PORT=3100` (clean `.next` first): all specs green incl. the 2 new ones + axe.
- [ ] Chrome QA on a live dev server: (a) RSO result → "Save shareable image" downloads a clean branded PNG with the right cap + as-of date; (b) `/guides/la-rent-increase-2026` renders correctly light/dark with the dated table + CTA.
- [ ] Use superpowers:finishing-a-development-branch → merge `feat/marketing-wave1` to master → push → prod-verify → delete branch → update memory.

## Self-review notes

- **Spec coverage:** share card (T2–3), cornerstone (T4–6), OG (T1). ✓ ES mirror of cornerstone explicitly deferred to Wave 2 (per spec).
- **Guardrails:** every figure from `LEGAL` with as-of/effective dates; `value:null` stays pending; no PII/no capture (card is client-side `toPng`, no upload); honest-label on the card + page; no new org contact surfaced. ✓
- **Dep justification:** `html-to-image` is justified (the #1 marketing asset needs font-faithful rendering; manual canvas is error-prone for Fraunces). ✓
- **Type consistency:** `shareCardData` returns `{title,plain,capLabel,covered,asOf}` used by `ShareCard`; `cornerstoneRows`/`cornerstoneFaqs` shapes used by the page + schema. ✓
