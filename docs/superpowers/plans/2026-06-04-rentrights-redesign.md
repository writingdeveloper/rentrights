# RentRights 2026 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement task-by-task. Visual work → verification is `build` + **Chrome QA in light+dark × EN/ES**, not unit tests. Steps use `- [ ]`.

**Goal:** Reskin RentRights to a calm, trustworthy, typography-led "Quiet Document + status-hero" design on a semantic light/dark token system, fixing the dark-mode contrast + invisible-font bugs, with zero logic/i18n changes.

**Architecture:** A semantic CSS-variable token layer in `globals.css` (exposed to Tailwind v4 via `@theme inline`), `next/font` Fraunces+Inter, then a mechanical class-swap sweep across 11 components, then a result restructure (3 bands) + status-hero verdict + one reduced-motion-guarded reveal.

**Tech Stack:** Tailwind v4 (`@theme inline`), `next/font/google`, React 19, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-06-04-rentrights-redesign-design.md`

---

## File Structure

- **Modify** `app/globals.css` — token system (light+dark), `@theme inline` color/font mappings, body type, focus ring, default border, reduced-motion + prefers-contrast.
- **Modify** `app/layout.tsx` — Fraunces+Inter via `next/font/google`; drop Geist+Arial override.
- **Modify** `app/page.tsx` — token swap; 3-band result grouping; reduced-motion-guarded reveal wrapper; serif wordmark.
- **Modify** `components/ResultCard.tsx` — status-hero verdict (icon + serif headline + focal stat + tinted token surface + non-color cue).
- **Modify** the rest: `IncreaseChecker`, `GetHelp`, `WhatToDoNow`, `ConfirmingQuestions`, `AddressAutocomplete`, `ShareButton`, `Disclaimer`, `RecordsDetails`, `SeoFaq` — token swap only.

## Token mapping (used in the sweep)

| Old (light-mode-fixed) | New (semantic token) |
|---|---|
| `text-gray-900`, `text-gray-700`, bare body text | `text-foreground` (or remove → inherits) |
| `text-gray-600`, `text-gray-500` | `text-muted-foreground` |
| `border-gray-200/300`, bare `border` | `border-border` |
| `border-gray-400` | `border-border-strong` |
| `bg-white` | `bg-surface` |
| `bg-green-50` / `border-green-700` / `text-green-700` / `text-green-800` | `bg-success-soft` / `border-success` / `text-success` |
| `bg-amber-50` / `border-amber-200/300` / `text-amber-900` / `text-amber-700` | `bg-warning-soft` / `border-warning` / `text-warning` |
| `text-red-700` | `text-danger` |
| `text-blue-600`, `text-blue-700`, `bg-blue-600` | `text-primary`, `bg-primary` (button: `text-background`) |

---

## Task 1: Semantic token system + type + focus (globals.css)

**Files:** Modify `app/globals.css` (full replace)

- [ ] **Step 1: Replace `app/globals.css` with:**

```css
@import "tailwindcss";

:root {
  --background: #FBFCFD;
  --surface: #FFFFFF;
  --surface-muted: #F2F5F8;
  --foreground: #0E1726;
  --muted-foreground: #52617A;
  --border: #DBE2EA;
  --border-strong: #AEBBCB;
  --primary: #1A5FBF;
  --primary-soft: #E7F0FB;
  --success: #1F7A4D;
  --success-soft: #E3F3EA;
  --warning: #A65B00;
  --warning-soft: #FBEFDD;
  --danger: #B42318;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0C111A;
    --surface: #141B26;
    --surface-muted: #1C2533;
    --foreground: #E8EDF3;
    --muted-foreground: #9DAABD;
    --border: #283142;
    --border-strong: #3C485C;
    --primary: #6BA6F2;
    --primary-soft: #16243B;
    --success: #56C98A;
    --success-soft: #10241A;
    --warning: #E5A85A;
    --warning-soft: #241B10;
    --danger: #F0857A;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-primary: var(--primary);
  --color-primary-soft: var(--primary-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-danger: var(--danger);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-fraunces), ui-serif, Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}

*,
::before,
::after {
  border-color: var(--border);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 1.0625rem; /* 17px */
  line-height: 1.65;
}

h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }

a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible,
[role="option"]:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-contrast: more) {
  :root {
    --muted-foreground: var(--foreground);
    --border: var(--border-strong);
  }
}
```

- [ ] **Step 2: Verify build** — Run: `npm run build` → exit 0 (Tailwind compiles the new theme; the app will look unstyled-ish until fonts/sweep land, that's fine).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): semantic light/dark token system + 17px type + token focus ring"
```

---

## Task 2: Fonts — Fraunces + Inter (layout.tsx), drop Geist + Arial override

**Files:** Modify `app/layout.tsx`

- [ ] **Step 1: Replace the font imports + setup** in `app/layout.tsx`.

Change the two Geist imports:
```tsx
import { Geist, Geist_Mono } from 'next/font/google';
...
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
```
to:
```tsx
import { Fraunces, Inter } from 'next/font/google';
...
const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], display: 'swap' });
```

- [ ] **Step 2: Update the `<html>` className** in `RootLayout`:

from `className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}`
to `className={`${inter.variable} ${fraunces.variable} h-full antialiased`}`

> The Arial override that defeated the font lived in `globals.css` and was already removed in Task 1 (body now uses `var(--font-sans)` = Inter). Spanish diacritics are covered by the `latin` subset.

- [ ] **Step 3: Verify** — Run: `npx tsc --noEmit` → 0; `npm run build` → 0.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(design): load Fraunces (serif) + Inter (sans) via next/font, drop Geist"
```

---

## Task 3: Token color sweep across components (no logic changes)

**Files:** Modify `components/{ResultCard,IncreaseChecker,GetHelp,WhatToDoNow,ConfirmingQuestions,AddressAutocomplete,ShareButton,Disclaimer,RecordsDetails,SeoFaq}.tsx` and `app/page.tsx`. Apply the token mapping table above. Only `className` strings change — never `t()`, props, handlers, or ARIA.

- [ ] **Step 1: Apply per-file swaps** (exact changes):

- **`app/page.tsx`**: `<main … max-w-xl …>` → `max-w-2xl` (app-flow width per spec); `text-blue-700` (h1) → `text-primary font-serif`; `text-gray-600` (tagline) → `text-muted-foreground`; the Check `<button>` `bg-blue-600 … text-white` → `bg-primary … text-background`; error box `bg-red-50 … text-red-700` → `bg-surface-muted … text-danger border border-border`.
- **`ResultCard.tsx`**: `border-gray-200` → `border-border`; `text-green-700` (reassure) → `text-success`; confidence pill `border-green-700 bg-green-50 text-green-700` → `border-success bg-success-soft text-success`; `text-gray-600` → `text-muted-foreground`; `text-green-700` (cap) → `text-success`; `text-gray-700` (points) → `text-foreground`; banner `border-amber-300 bg-amber-50 text-amber-900` → `border-warning bg-warning-soft text-warning`. (Hero restructure is Task 4.)
- **`IncreaseChecker.tsx`**: input `border` → `border border-border bg-surface`; `text-gray-600` → `text-muted-foreground`; `toneClass` map `text-red-700|text-amber-700|text-green-700` → `text-danger|text-warning|text-success`.
- **`GetHelp.tsx`**: `border-gray-200` → `border-border`; `text-gray-600` → `text-muted-foreground`; `text-blue-600` (links) → `text-primary`.
- **`WhatToDoNow.tsx`**: `border-amber-200 bg-amber-50` → `border-warning bg-warning-soft`; `text-amber-900` (×2) → `text-warning`.
- **`ConfirmingQuestions.tsx`**: common-option `border-green-700 bg-green-50 text-green-800` → `border-success bg-success-soft text-success`; `· common` span `text-green-700` → `text-success`; default option `border-gray-300` → `border-border`; card `border-gray-200` → `border-border`; help `text-gray-500` → `text-muted-foreground`; unsure button `border-gray-400 text-gray-500` → `border-border-strong text-muted-foreground`.
- **`AddressAutocomplete.tsx`**: input `border` → `border border-border bg-surface`; dropdown container `bg-white border` → `bg-surface border border-border`; any `text-gray-*` → `text-muted-foreground`; active/hover option bg → `bg-surface-muted`; (read the file; apply the mapping to every gray/white/blue class). Keep all refs/handlers/ARIA intact.
- **`ShareButton.tsx`**: button `border` → `border border-border`; `text-gray-600` (×2) → `text-muted-foreground`; fallback input `border` → `border border-border bg-surface`.
- **`Disclaimer.tsx`**: `text-gray-500` → `text-muted-foreground`.
- **`RecordsDetails.tsx`**: `border-gray-200` → `border-border`; `text-gray-600` (summary) → `text-muted-foreground`; `text-gray-700` (list) → `text-foreground`.
- **`SeoFaq.tsx`**: `text-gray-600` (intro) → `text-muted-foreground`; the FAQ `<dt>` already inherits foreground (keep); `<dd>` `text-sm` (inherits) keep, or set `text-muted-foreground` for hierarchy — **set `dd` to `text-muted-foreground`** now that it's AA in dark; `border-t` (section) → `border-t border-border`.

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → 0; `npm run lint` → 0; `npm run build` → 0.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx components/
git commit -m "feat(design): sweep components to semantic tokens (fixes dark-mode contrast)"
```

---

## Task 4: Status-hero verdict + result restructure + guarded reveal

**Files:** Modify `components/ResultCard.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Status-hero verdict in `ResultCard.tsx`.** Replace the component body with a hero: a status **icon + label prefix** (non-color cue), serif verdict headline, the cap as a large `tabular-nums` focal stat, on a tinted token surface keyed by coverage. Full file:

```tsx
'use client';
import { RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, capStaleness, stalenessMessage, notFinalBanner, isCovered } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';

export function ResultCard({ result }: { result: RegimeResult }) {
  const t = useT();
  const rights = rightsText(result.regime, t);
  const detailed = result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN';
  const covered = isCovered(result.regime);
  // Non-color status cue (WCAG 1.4.1): icon + tinted surface chosen by coverage.
  const tone = covered ? 'success' : 'warning';
  const icon = covered ? '✓' : 'ⓘ';
  const heroSurface = covered ? 'bg-success-soft' : 'bg-warning-soft';
  const heroAccent = covered ? 'text-success' : 'text-warning';

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      <div className={`${heroSurface} p-5`}>
        {covered && <p className="mb-1 text-sm font-medium text-muted-foreground">{t('result.reassure')}</p>}
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className={`mt-0.5 text-2xl ${heroAccent}`}>{icon}</span>
          <div>
            <h2 className="font-serif text-2xl font-bold leading-tight">{t('result.likelyPrefix')} {rights.title}</h2>
            {detailed && (
              <>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('result.legalIncrease')}</p>
                <p className={`text-3xl font-extrabold tabular-nums ${heroAccent}`}>{capLabel(result.regime, t)}</p>
                {(() => {
                  const s = capStaleness(result.regime);
                  return s?.stale ? <p className="mt-1 text-xs text-muted-foreground">⚠ {stalenessMessage(s, t, result.regime)}</p> : null;
                })()}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
          {rights.points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <div className="mt-4 rounded-lg border border-warning bg-warning-soft p-2 text-xs font-semibold text-warning">
          {notFinalBanner(result.regime, t)}
        </div>
      </div>
    </div>
  );
}
```

> Confidence pill removed from the hero for calm (confidence is implicit in "Likely" + the records detail). Status is icon+text+surface, never color alone. `role="status"` announcement stays in `app/page.tsx` (unchanged).

- [ ] **Step 2: Result restructure + serif wordmark + reveal wrapper in `app/page.tsx`.** Group the result into three visual bands and wrap it in a reduced-motion-guarded reveal. The `{data && (…)}` block's inner `<div className="mt-6">` becomes `<div className="mt-8 space-y-8 result-reveal">` with three `<section>` bands:
  - Band 1 "Your answer": the `role="status"` line + `<ResultCard>`.
  - Band 2 "What to do": `<IncreaseChecker>` + `WhatToDoNow` (when covered) + `ConfirmingQuestions` (when questions) + dataWarnings.
  - Band 3 "Get help + details": `<GetHelp>` + `<RecordsDetails>` + `<ShareButton>` + `<Disclaimer>`.

Exact replacement for the result block:

```tsx
      {data && (
        <div className="mt-8 space-y-8 result-reveal">
          <section>
            <p role="status" className="sr-only">{t(`rights.${data.result.regime}.title`)}</p>
            <ResultCard result={data.result} />
          </section>
          <section className="space-y-4">
            <IncreaseChecker regime={data.result.regime} />
            {isCovered(data.result.regime) && <WhatToDoNow regime={data.result.regime} />}
            {data.result.questions.length > 0 && (
              <ConfirmingQuestions
                questions={data.result.questions}
                answers={answers}
                onAnswer={(next) => { setAnswers(next); run(address, next); }}
              />
            )}
            {data.dataWarnings?.map((w: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">{t(`warning.${w}`)}</p>
            ))}
          </section>
          <section className="space-y-4">
            <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null && data.jurisdiction?.inLACounty === true} />
            <RecordsDetails reasons={data.result.reasons} />
            <ShareButton address={address} answers={answers} locale={locale} />
            <Disclaimer lastVerified={data.lastVerified} />
          </section>
        </div>
      )}
```

> Note: this removes the per-element `mt-*` reliance by using `space-y` on bands; `IncreaseChecker`/`WhatToDoNow`/etc. keep their own internal `mt-*` which is harmless inside the spaced sections. Keep the `<SeoFaq />` after this block.

- [ ] **Step 3: Add the guarded reveal to `app/globals.css`** (append):

```css
@keyframes result-reveal {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
.result-reveal { animation: result-reveal 220ms ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .result-reveal { animation: none; }
}
```

- [ ] **Step 4: Verify** — Run: `npx tsc --noEmit` → 0; `npm run lint` → 0; `npm test` → 182 pass; `npm run build` → 0.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/ResultCard.tsx app/globals.css
git commit -m "feat(design): status-hero verdict + 3-band result + reduced-motion reveal"
```

---

## Task 5: Full gate + Chrome QA (light + dark × EN/ES)

**Files:** none (verification)

- [ ] **Step 1: Gate** — `npx tsc --noEmit` 0 · `npm run lint` 0 · `npm test` 182 · `npm run build` 0.

- [ ] **Step 2: Chrome QA (operator, in-session).** `npm run build && npx next start -p 3005`. In Chrome, with the OS/browser in **dark** then **light**, and in **EN** then **ES**:
  - Landing: serif wordmark + Inter body render (NOT Arial); tagline readable; input/button styled with tokens; contrast ok.
  - Run a lookup (e.g. 1411 Murray Dr): status-hero shows **icon + serif verdict + focal cap**, tinted surface; result reveals with a subtle fade (and none under reduced-motion); 3 bands legible.
  - Confirming-questions path: options readable, "most common" emphasis via success tokens (icon/weight, not hue-only), unsure button visible.
  - Get-help links, FAQ, share, disclaimer all readable in both schemes.
  - Spot-check key text pairs ≥4.5:1 and UI ≥3:1 in both schemes; touch targets ≥44–48px.
  - Confirm EN/ES toggle works and nothing regressed functionally.
  - Stop the server; leave port 3000 alone.

---

## Notes
- Pure visual/structural reskin: no `t()`/i18n keys, engine, or route changes. Existing 182 tests must stay green (none assert classNames).
- SEO polish + rate-limit are separate follow-up PRs (not in this plan).
