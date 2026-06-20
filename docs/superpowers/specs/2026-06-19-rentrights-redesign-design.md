# RentRights UI/UX Redesign — Design Spec ("Justice Green · Grassroots")

**Date:** 2026-06-19
**Status:** Approved (brainstorming → spec)
**Branch:** `feat/redesign-justice-green`

## Goal

Transform RentRights from a visually "government / institutional" feel into a warm,
distinctive, crafted **"Justice Green · grassroots"** identity — while strictly
preserving its trust posture, legal honesty, real-data accuracy, bilingual (EN/ES)
support, and WCAG 2.2 AA accessibility.

## Background / Problem

A four-lens expert review (visual/brand, UX/IA, accessibility+QA, layperson renter)
plus web research converged on one diagnosis: the underlying **structure and
engineering are strong**, but three things make the product read like a `.gov` form:

1. **Surface** — cool civic-blue (`#1A5FBF`) on near-pure-white (`#FBFCFD`) + cool
   greys; no brand mark, no real icons (text glyphs `✓ ⓘ →`), flat depth.
2. **First screen** — no hero; a bare input followed immediately by a dense legal FAQ.
3. **Voice** — caveat-heavy, jargon (RSO/AB1482/LAHD/ADU), scary "AI"/"Likely",
   `%` with no `$`.

This undercuts trust for stressed renters and undersells the project as a portfolio
centerpiece. Reference inspirations: **JustFix** (same audience, warm off-white +
charcoal), **Mercury** (cream + ink + single accent = "restraint = trust"),
**ProPublica** (rigorous + human editorial type), **NN/g Trustworthy Design**,
**USWDS "Establish Trust"**, **WCAG 2.2**, **Refactoring UI**.

## Non-goals

- No change to legal logic, the data pipeline, or the accuracy of any figure.
- No weakening of honest disclosures (estimate, not legal advice, confirm with
  authority, verified date, pending formal legal-aid review).
- No new backend, no analytics change, no ads/monetization.
- No new locales beyond EN/ES.

## Constraints (hard)

- **Legal honesty preserved (RR-2 posture).** The "community tool / checked against
  statutes / pending formal legal-aid review / not legal advice" disclosure stays
  **present and accessible** — it is only **re-worded warmly and relocated** (decision
  **A**), never removed or softened in substance. No wording may overstate certainty.
- **Real / accurate data only.** All figures come from the existing dated `LEGAL`
  constants (`lib/legal/constants.ts`) and the live `/api/lookup`. Any `$` figure
  shown as an illustration must be explicitly labelled **"example"** and computed from
  the real cap %; when the user enters their own rent in the checker, the real compute
  path is used.
- **Next.js 16.** This repo's Next has breaking changes vs. training data. Before
  writing any code touching framework surfaces (fonts, App Router, metadata, images),
  **read the relevant guide in `node_modules/next/dist/docs/`** and heed deprecations.
- **Bilingual EN/ES.** Every user-facing string lives in `messages/en.json` +
  `messages/es.json`. Design for Spanish text expansion (+15–30%, buttons up to +75%):
  no fixed-height/`truncate`/`nowrap` on text containers.
- **WCAG 2.2 AA** in light AND dark, EN AND ES. The guardrails below are CI-enforced.
- **Performance.** Keep PSI ~100/100/100/100. `lucide-react` must be tree-shaken
  (named imports only); fonts `display: swap`; no heavy client JS added.
- **QA-first.** Automated gates + a manual Chrome QA matrix pass before every merge
  (see QA Strategy). This is the user's explicit top priority.

---

## Design System (tokens)

### Palette — light (`:root`)

| Token | Value | Role |
|---|---|---|
| `--background` | `#F6F4EF` | warm cream paper |
| `--surface` | `#FFFDF9` | barely-warm card white (not pure #FFF) |
| `--surface-muted` | `#EFEBE2` | warm sand (secondary blocks) |
| `--foreground` | `#23262B` | warm ink |
| `--muted-foreground` | `#5B5A54` | warm grey (no blue cast); ≥4.5:1 on cream |
| `--border` | `#E2DCD0` | warm hairline (decorative only) |
| `--border-strong` | `#B9B0A0` | stronger decorative edge |
| `--border-input` | `#857D6B` | **input/control edges — must be ≥3:1 (fixes the 1.27:1 bug)** |
| `--primary` | `#1F6B4A` | **brand deep green** — wordmark, headlines, CTA, links, focus |
| `--primary-strong` | `#18573C` | hover / active |
| `--primary-soft` | `#E4EFE7` | chip / callout tint |
| `--success` | `#1F7A4D` | status "protected" (result hero only) |
| `--success-soft` | `#E3F3EA` | protected hero surface |
| `--warning` | `#9C5400` | caution / needs-info |
| `--warning-soft` | `#FBEFDD` | caution surface |
| `--danger` | `#B42318` | over-cap |

### Palette — dark (`@media (prefers-color-scheme: dark)`)

Warm charcoal, NOT cool slate:
`--background #15140F` · `--surface #201E18` · `--surface-muted #2A2720` ·
`--foreground #ECE7DD` · `--muted-foreground #B0A99B` · `--border #332F26` ·
`--border-strong #4A4537` · `--border-input #5A5446` · `--primary #5FC08A` ·
`--primary-strong #7AD0A0` · `--primary-soft #15281D` · `--success #56C98A` /
`--success-soft #10241A` · `--warning #E5A85A` / `--warning-soft #241B10` ·
`--danger #F0857A`. Every pair re-verified for AA at implementation.

### Brand-green vs status-green disambiguation

Brand green (`#1F6B4A`, slightly cooler forest) and status success (`#1F7A4D`,
slightly warmer) are intentionally close but distinct. The result "protected" state
is **always** presented as a labelled status component — a left color **rail** +
`shield-check` icon + an **eyebrow label** ("PROTECTED" / "LIKELY PROTECTED") — so it
reads as *status*, never confused with brand chrome. Non-protected results use the
amber/neutral hero, clearly different.

### Typography

- **Fraunces** (variable; engage `opsz`, `wght`, `SOFT`, `WONK`) for: wordmark, hero
  headline, result verdict, and the big cap number. Display sizes via `clamp()`, tight
  tracking (~-0.02em), a touch of wonk for warmth. Avoid light weights at display size.
- **Inter** for all other UI, body, labels.
- **Scale:** `13 · 14 · 15 · 17 (body) · 20 · 26 · 34 · 48 · 64`. **No legal/warning/
  help text below 14px** (fixes the 12px `text-xs` smell). Body stays 17px.
- All figures (cap %, $) use `tabular-nums`.

### Iconography

`lucide-react` (MIT, tree-shakeable). Replace text glyphs with: `key`, `shield-check`,
`info`, `alert-triangle`, `arrow-right`, `check`, `x`, `map-pin`, `phone`, `share-2`.
1.5px stroke, colored by brand/status. **Keep `aria-hidden` + a text label** on every
icon (non-color cue preserved).

### Depth, radius, motion, texture

- Shadows (warm-tinted): `--shadow-sm: 0 1px 2px rgba(35,38,43,.06)`;
  `--shadow-md: 0 6px 20px rgba(35,38,43,.08)`; `--shadow-lg: 0 16px 40px rgba(35,38,43,.10)`.
- Radius: `--radius: 12px` (inputs/buttons), `--radius-lg: 18px` (cards),
  `--radius-pill: 999px`.
- Motion: keep `result-reveal`; add a gentle **count-up** on the cap number and a soft
  accent underline wipe under the verdict — **all gated by `prefers-reduced-motion`**.
- Texture (optional, low-cost): a masthead hairline under the wordmark; an optional
  1–2% warm paper grain on the background. No gimmicks.

---

## Information Architecture / First Screen

**Home, no result:**

1. **Header** — `key` brand mark + "RentRights" wordmark (Fraunces, green) + a
   prominent, labelled **EN | ES** toggle. Masthead hairline beneath.
2. **Hero** — Fraunces display headline + an Inter sub-line that states the function;
   the **address input is the visual centerpiece** with the green **Check** button.
3. **Trust chips** directly under the input: Public records · Updated {date} · Free,
   nothing saved · English / Español (each with a Lucide icon).
4. **"How it works"** 3-step strip: 1 Enter address → 2 See protections & cap →
   3 Check if an increase is legal.
5. **FAQ demoted** below the fold under "Common questions about LA rent law" (kept for
   SEO/AI-crawlers, no longer the primary human content).
6. **Footer** — disclaimer once, links, language.

**On result:** the hero collapses to a **compact header** (small wordmark + the
looked-up address); the result experience takes over; FAQ remains at the bottom.

**Mobile:** single column; headline `clamp()`; input + button full-width. **Language:**
auto-detect on first paint (existing `lib/i18n/detect.ts`); toggle stays prominent.

---

## Result Experience

**ResultCard — "the screenshot moment" + explicit finality:**

- Status **hero**: left color **rail** (status), status icon (`shield-check`/`info`/
  `alert-triangle`), **eyebrow label**, then the regime name in Fraunces.
- **Cap**: Fraunces display number + **`$` alongside `%`**, e.g. "up to 3% — about
  $60/mo more on $2,000 (example)". Example clearly labelled; real compute when the
  checker is used.
- **Verified date** as a positive `shield-check` pill (trust, not caveat).
- **Explicit finality line** (the key UX fix): no pending questions → green pill
  "Final answer — nothing more to enter"; questions pending → "Almost there — answer
  1 question below to confirm."
- Rights bullets (plain language) in the card body.
- **One** consolidated honest line: "Estimate from public records. Confirm free with
  the LA Housing Department (LAHD): (866) 557-7368." (replaces 3 repeated amber boxes).

**Band 2 — clear "next" rhythm:**

1. **ConfirmingQuestions** (only if present) — mini-wizard: "Question 1 of N", a
   one-line recap of each answer, reassurance ("Not sure? We'll keep your estimate
   conservative."), "I'm not sure" stays the safe default.
2. **IncreaseChecker — elevated**: a real card with heading "Check your specific
   increase", larger inputs, example placeholder ("e.g. 2,000 → 2,200"), a friendly
   empty state, and a verdict with **icon + words** (not color alone): "✓ Within the
   legal limit" / "✕ Over the legal limit by ~$X/mo".
3. **WhatToDoNow** — calmer tone (guidance, not warning).
4. **EvictionNotice**.

**Band 3:** GetHelp (warmer org cards), RecordsDetails ("Behind this estimate" —
transparency = trust, keep), ShareButton, Disclaimer (once).

**States:** loading → a **result-shaped skeleton** (hero silhouette + lines); error →
a friendly sentence + "Try again" button + a fallback link (e.g., LA County Assessor).

---

## Voice & Copy

**Principles:** warm, plain, confident — honesty preserved.

- **Decision A (confirmed):** the RR-2 honesty disclosure stays present and accessible
  but is **re-worded warmly and relocated** (beside the result + in "Behind this
  estimate" + footer) rather than as a cold first line above the input. The fact that
  figures are AI-and-statute-checked (not yet attorney-reviewed) remains disclosed in
  "Behind this estimate". Example warm line: *"A free community tool. We check every
  figure against LA's official rent laws (updated {date}) — solid information, not
  legal advice. Always confirm with the housing department."*
- **Expand acronyms on first use**: RSO, LAHD, AB 1482, ADU, etc.
- **`%` + `$`** everywhere a cap is shown (example labelled; real when computed).
- **Confidence wording**: high-confidence → "Protected (estimated)" rather than a bare
  "Likely"; keep "estimate" honesty nearby.
- **De-robotize**: "question(s)" → "1 question" / "2 questions".
- **Every new/changed string in EN + ES.**

---

## Accessibility Guardrails (CI-enforced)

- Text ≥ **4.5:1** (large text ≥ 3:1). `--muted-foreground` must stay ≥4.5:1 on every
  surface it lands on.
- Non-text ≥ **3:1** for input borders, focus indicators, and meaning-bearing icons
  (fixes the current 1.27:1 input border).
- No legal/warning/help text **< 14px**; body stays 17px. No ultralight/decorative
  fonts for content.
- Target size ≥ **24px** (primary actions aim 44px); keep existing `min-h-11`.
- Visible focus on every interactive element (≥2px outline, ≥2px offset, ≥3:1).
- **Never signal status by color alone** — keep icon + word on result hero AND add a
  non-color cue to the increase-checker verdict.
- **Spanish expansion**: no fixed widths/`truncate`/`nowrap` on text; test `es` at 320px.
- **Dark mode** measured independently; avoid pure-white-on-black; keep accents slightly
  desaturated.
- `prefers-reduced-motion`, `prefers-contrast: more` (must yield real ≥3:1 borders),
  200% zoom / 400% reflow at 320px CSS width — all still work.

---

## QA Strategy (top priority)

**Two gates: automated (CI) + manual (Chrome), both must pass before every merge.**

### Development discipline
- **TDD (RED → GREEN)** per change; frequent commits; work only on the feature branch.

### Automated CI gates (block merge)
- Existing suite (~188 tests) stays green.
- **New: token-contrast unit test** — asserts every token pair meets its AA ratio
  (light + dark).
- **axe-core via Playwright** on home + a result page, **light/dark × EN/ES** (0
  serious/critical violations).
- **Lighthouse budget** — accessibility 100; performance not regressed from ~100.
- (Optional) visual-regression screenshots for the home + result.

### Manual Chrome QA matrix (on the Vercel preview, from the user's perspective,
whole site in order — per the project's standing QA rule)
- **Viewports:** 320 / 375 / 768 / 1280.
- **Schemes:** light + dark. **Locales:** EN + ES (check wrapping/expansion).
- **Keyboard-only** pass + visible focus; screen-reader smoke (live regions announce).
- `prefers-reduced-motion` + `prefers-contrast: more`.
- **Real addresses across every regime:** RSO (e.g. 1411 Murray Dr), AB 1482, LA
  County, needs-more-info, out-of-jurisdiction; plus network-error and loading states.
- **Data authenticity recheck** — figures match the real `/api/lookup` / Assessor roll
  (no fabrication).

### Process
branch → TDD implement → automated gates green → **deploy preview → full manual Chrome
QA → fix → `merge --no-ff` → push → re-verify production**.

---

## File Map (units + responsibilities)

- `app/globals.css` — tokens (light+dark), type setup, shadow/radius scale, grain,
  motion keyframes.
- `app/layout.tsx` — Fraunces variable-axis loading + Inter (read Next 16 font docs).
- `app/page.tsx` — hero + IA ordering, compact header on result, loading/error states.
- **New:** `components/Hero.tsx`, `components/HowItWorks.tsx`, `components/TrustChips.tsx`,
  `components/ResultSkeleton.tsx`, `components/Icon.tsx` (Lucide wrapper enforcing
  aria-hidden+label), `components/Wordmark.tsx` (brand mark + wordmark).
- **Reworked:** `ResultCard`, `IncreaseChecker`, `ConfirmingQuestions`, `WhatToDoNow`,
  `GetHelp`, `RecordsDetails`, `Disclaimer`, `ShareButton`, `EvictionNotice`,
  `SeoFaq` (demoted/restyled).
- `messages/en.json` + `messages/es.json` — all new/changed strings.
- `package.json` — add `lucide-react`.
- Tests — `test/contrast.test.ts` (new), `test/a11y.e2e.ts` (axe, new), updated
  component tests, e2e for new flows.
- `scripts/generate-icons.mjs` — re-run only if the brand mark changes.

---

## Rollout (phases — each shippable and QA'd)

1. **Foundation** — tokens, type, Lucide + `Icon`/`Wordmark`, shadow/radius. Gate:
   contrast test. (No visible breakage.)
2. **Result experience** — ResultCard, IncreaseChecker, ConfirmingQuestions, finality,
   `$`. (Highest value.)
3. **First screen** — Hero, HowItWorks, TrustChips, FAQ demotion, loading/error
   skeleton, compact-on-result header.
4. **Voice & copy** — full EN+ES pass; remaining components restyle; decision-A
   disclosure rewording/relocation.
5. **A11y/QA hardening** — axe + (optional) visual regression in CI; full Chrome QA
   matrix; performance recheck.

Each phase: TDD → automated gates → preview → Chrome QA → `merge --no-ff`.

---

## Acceptance Criteria

- The home page leads with a branded hero; the FAQ is below the fold.
- Palette is the warm-cream / deep-green / warm-ink system in light and dark; no
  `#1A5FBF`/`#FBFCFD` remain; brand mark + Lucide icons present.
- Result card shows an explicit finality state, `$` alongside `%`, a positive verified
  pill, and a single consolidated honest line.
- IncreaseChecker is a prominent card with an icon+word verdict and a friendly empty
  state; ConfirmingQuestions shows progress + recap + reassurance.
- All honest disclosures remain present (decision A); no figure is fabricated; `$`
  examples are labelled.
- CI: ~188 existing tests + contrast test + axe (light/dark × EN/ES) green; PSI a11y
  100, performance ~100.
- Manual Chrome QA matrix passes on the preview across all viewports/schemes/locales
  and every result regime, including keyboard and reduced-motion.
- Strings complete in EN + ES; ES verified at 320px with no clipping.

## Open Questions

None blocking. (Optional, deferrable: whether to ship the paper-grain texture and the
cap-number count-up — both are low-risk enhancements gated behind reduced-motion / a flag
and can be decided during Phase 1/2 QA.)
