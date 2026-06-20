# RentRights "Justice Green" Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin and re-flow RentRights into a warm "Justice Green · grassroots" identity (cream paper / deep green / warm ink, hero-first home, screenshot-worthy result card, warmer plain-language voice) without weakening its legal honesty, data accuracy, bilingual support, or WCAG AA accessibility.

**Architecture:** Pure front-end change. Swap the CSS-variable design tokens in `app/globals.css`, add Fraunces display + Lucide icons, introduce a hero/IA on `app/page.tsx`, and rework the presentation components. All copy flows through the existing i18n catalog (`messages/en.json` + `messages/es.json`, resolved by `lib/i18n/t.ts`). No legal logic, data pipeline, or API changes.

**Tech Stack:** Next.js 16.2.7 (App Router), React 19, Tailwind v4 (`@theme inline` tokens), `lucide-react`, Vitest 4 (`tests/**`, env `node`, jsdom per-file for components), Playwright (`e2e/**`).

**Source spec:** `docs/superpowers/specs/2026-06-19-rentrights-redesign-design.md`

---

## Conventions (read once, apply to every task)

- **Branch:** `feat/redesign-justice-green` (already created). Never commit to master.
- **TDD:** For each task — write/adjust the failing test → run it red → implement → run green → commit. Test command: `npm test` (all) or `npm test -- <path>` (one file). E2E: `npm run e2e`.
- **Tests live in `tests/`** mirroring source (e.g. `components/ResultCard.tsx` → `tests/components/resultcard.test.tsx`). Component tests start with `// @vitest-environment jsdom` and use `@testing-library/react`.
- **i18n parity is enforced** by `tests/i18n/coverage.test.ts`: every key added to `messages/en.json` MUST also exist in `messages/es.json` (and vice-versa). Add both in the same task.
- **Next.js 16:** before editing framework surfaces (fonts in `layout.tsx`, metadata, images) **read the relevant guide under `node_modules/next/dist/docs/`**. APIs differ from training data.
- **Legal honesty (hard):** never reword a disclosure to overstate certainty. Keep "estimate / not legal advice / confirm with authority / verified date / pending formal legal-aid review" present (decision A = warmer wording + relocation, not removal).
- **Real data (hard):** any `$` figure shown as illustration is labelled "example" and derived from the real cap %; the checker uses the real `checkIncrease` compute.
- **A11y (hard):** text ≥4.5:1, non-text (input borders, focus, meaning icons) ≥3:1, legal/warning text ≥14px, keep focus rings, keep icon+word (never color-only), design for ES +15–30% (no `truncate`/fixed widths on text).
- **Commit message trailer** (every commit):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QWHBFTcQPeN7vZzMxTqs1Y
  ```

---

# PHASE 1 — Foundation (tokens, type, icons)

### Task 1: Warm design tokens + contrast CI gate

**Files:**
- Modify: `app/globals.css` (`:root`, dark `@media`, `@theme inline`)
- Create: `tests/design/contrast.test.ts`

- [ ] **Step 1: Write the failing contrast test** — `tests/design/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// WCAG relative luminance + contrast ratio (sRGB).
function lum(hex: string): number {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function ratio(a: string, b: string): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Mirror of the tokens in app/globals.css. Keep in sync (this is the gate).
const light = {
  background: '#F6F4EF', surface: '#FFFDF9', surfaceMuted: '#EFEBE2',
  foreground: '#23262B', mutedForeground: '#5B5A54',
  borderInput: '#857D6B', primary: '#1F6B4A', primaryStrong: '#18573C',
  success: '#1F7A4D', successSoft: '#E3F3EA', warning: '#9C5400', warningSoft: '#FBEFDD',
  danger: '#B42318',
};
const dark = {
  background: '#15140F', surface: '#201E18', surfaceMuted: '#2A2720',
  foreground: '#ECE7DD', mutedForeground: '#B0A99B',
  borderInput: '#5A5446', primary: '#5FC08A',
  success: '#56C98A', successSoft: '#10241A', warning: '#E5A85A', warningSoft: '#241B10',
  danger: '#F0857A',
};

describe('token contrast (WCAG 2.2 AA)', () => {
  for (const [name, p] of [['light', light], ['dark', dark]] as const) {
    it(`${name}: body & status text >= 4.5:1`, () => {
      expect(ratio(p.foreground, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.foreground, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.mutedForeground, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.mutedForeground, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.primary, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.success, p.successSoft)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.warning, p.warningSoft)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.danger, p.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: white-on-primary button label >= 4.5:1`, () => {
      const onPrimary = name === 'light' ? '#FFFDF9' : '#15140F';
      expect(ratio(onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: input border (non-text) >= 3:1`, () => {
      expect(ratio(p.borderInput, p.background)).toBeGreaterThanOrEqual(3);
    });
  }
});
```

- [ ] **Step 2: Run red** — `npm test -- tests/design/contrast.test.ts` → FAIL (file/tokens new; some pairs may not meet target).
- [ ] **Step 3: Implement tokens** in `app/globals.css`. Replace the `:root` and dark `@media` blocks with the spec values (light: background `#F6F4EF`, surface `#FFFDF9`, surface-muted `#EFEBE2`, foreground `#23262B`, muted-foreground `#5B5A54`, border `#E2DCD0`, border-strong `#B9B0A0`, **add `--border-input: #857D6B`**, primary `#1F6B4A`, primary-strong `#18573C`, primary-soft `#E4EFE7`, success `#1F7A4D`/-soft `#E3F3EA`, warning `#9C5400`/-soft `#FBEFDD`, danger `#B42318`; dark per spec). Add to `@theme inline`: `--color-border-input`, `--color-primary-strong`, plus `--shadow-sm/md/lg`, `--radius/-lg/-pill` (see spec values). Keep the existing `prefers-contrast`/`prefers-reduced-motion`/focus blocks; in `prefers-contrast: more` set `--border` → a real ≥3:1 value (`#857D6B` light / `#5A5446` dark).
- [ ] **Step 4: Run green** — `npm test -- tests/design/contrast.test.ts`. If any pair fails, **darken/adjust that token (keep the hue) until it passes**, and update both `globals.css` and the test's mirror constant. Re-run until green.
- [ ] **Step 5: Full suite** — `npm test` (existing ~188 tests must stay green; tokens are referenced by class name, so no breakage expected).
- [ ] **Step 6: Commit** — `git add app/globals.css tests/design/contrast.test.ts && git commit` (`feat(design): warm Justice-Green tokens + contrast CI gate`).

### Task 2: Fonts — Fraunces variable axes + Inter

**Files:** Modify `app/layout.tsx`

- [ ] **Step 1: Read the Next 16 font guide** under `node_modules/next/dist/docs/` (search for the `next/font` / Google-fonts doc) to confirm the variable-axis API for this version.
- [ ] **Step 2: Configure Fraunces with display axes.** Update the import in `app/layout.tsx` so Fraunces exposes optical-size + soft/wonk, e.g.:
  ```ts
  const fraunces = Fraunces({
    variable: '--font-fraunces', subsets: ['latin'], display: 'swap',
    axes: ['opsz', 'SOFT', 'WONK'], // verify allowed axes against the doc; wght is included for variable
  });
  ```
  Keep Inter as-is. (No new test; verified by build + Chrome QA. Display styling itself is applied per-component in later tasks via `font-serif` + a `.font-display` utility you add to `globals.css` that sets `font-variation-settings` + tighter tracking.)
- [ ] **Step 3: Add a `.font-display` helper to `app/globals.css`:**
  ```css
  .font-display { font-family: var(--font-serif); font-variation-settings: "opsz" 120, "SOFT" 0, "WONK" 1; letter-spacing: -0.02em; line-height: 1.05; }
  ```
- [ ] **Step 4: Build check** — `npm run build` succeeds (font loads).
- [ ] **Step 5: Commit** — `feat(design): load Fraunces display axes + .font-display helper`.

### Task 3: Lucide icon wrapper

**Files:** Create `components/Icon.tsx`, `tests/components/icon.test.tsx`; modify `package.json`

- [ ] **Step 1: Install** — `npm i lucide-react` (MIT). Confirm it appears in `dependencies`.
- [ ] **Step 2: Failing test** — `tests/components/icon.test.tsx` (jsdom): asserts (a) decorative icon has `aria-hidden="true"` and no accessible name; (b) `label` prop renders an accessible name via `role="img"` + `aria-label`.

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Icon } from '@/components/Icon';

describe('Icon', () => {
  it('is aria-hidden by default (decorative)', () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
  it('exposes an accessible name when labelled', () => {
    render(<Icon name="shield-check" label="Protected" />);
    expect(screen.getByRole('img', { name: 'Protected' })).toBeTruthy();
  });
});
```

- [ ] **Step 3: Implement** `components/Icon.tsx`: a thin wrapper mapping a `name` to a Lucide component (named imports only, for tree-shaking), default `aria-hidden`, `strokeWidth={1.5}`, `width/height` from a `size` prop (default 20), color `currentColor`. When `label` is passed, set `role="img"` + `aria-label={label}` and drop `aria-hidden`.
- [ ] **Step 4: Run green** — `npm test -- tests/components/icon.test.tsx`.
- [ ] **Step 5: Commit** — `feat(design): Lucide Icon wrapper (aria-hidden default, labelled role=img)`.

### Task 4: Wordmark + brand mark

**Files:** Create `components/Wordmark.tsx`, `tests/components/wordmark.test.tsx`

- [ ] **Step 1: Failing test** (jsdom): renders the text "RentRights" and contains an `aria-hidden` mark (the `key` glyph), accepts a `compact` prop that still renders the name.
- [ ] **Step 2: Implement** `components/Wordmark.tsx`: `key` Lucide icon (aria-hidden) in a soft-cornered green tile + "RentRights" in `font-serif` `text-primary`. `compact` shrinks size for the on-result header. No new strings (brand name is not translated).
- [ ] **Step 3: Run green; Step 4: Commit** — `feat(design): brand Wordmark (key mark + Fraunces)`.

---

# PHASE 2 — Result experience

> Each task: read the current component first, then change presentation + add the new i18n keys to BOTH catalogs. Behavioral tests pin text/roles/icons; visuals are verified in Phase 5 Chrome QA.

### Task 5: ResultCard — rail + eyebrow + finality + $ + verified pill

**Files:** Modify `components/ResultCard.tsx`, `messages/en.json`, `messages/es.json`, `tests/components/resultcard.test.tsx`. Read `lib/content/rights.ts` (verdict/cap text source) first.

- [ ] **Step 1: Add i18n keys** to `messages/en.json` (and `es.json` translations):
  - `result.eyebrow.protected` = "Protected (estimated)" / es "Protegido (estimado)"
  - `result.eyebrow.likely` = "Likely protected" / "Probablemente protegido"
  - `result.eyebrow.needsInfo` = "Needs a quick answer" / "Falta un dato rápido"
  - `result.eyebrow.notCovered` = "Likely not covered" / "Probablemente no cubierto"
  - `result.finalAnswer` = "Final answer — nothing more to enter" / "Respuesta final — no falta nada"
  - `result.almostThere` = "Almost there — answer the question below to confirm" / "Ya casi — responde la pregunta de abajo para confirmar"
  - `result.capExample` = "On {rent} rent, that's about {amount}/mo more (example)" / "Con un alquiler de {rent}, son unos {amount}/mes más (ejemplo)"
  - `result.confirmLine` = "Estimate from public records. Confirm free with the LA Housing Department (LAHD): {phone}" / "Estimación basada en registros públicos. Confírmalo gratis con el Departamento de Vivienda de LA (LAHD): {phone}"
- [ ] **Step 2: Update the test** `tests/components/resultcard.test.tsx`: assert (a) a covered result shows the `result.finalAnswer` text when `result.questions.length === 0`; (b) shows `result.almostThere` when questions exist; (c) renders a `shield-check` labelled icon for covered; (d) the verified line still appears; (e) the cap example `$` line renders when a representative rent is provided. Run red.
- [ ] **Step 3: Implement** the card: left rail `div` colored by status; status `Icon` (`shield-check`/`info`/`alert-triangle`) with `label`; eyebrow label (uppercase, `text-xs`→ bump to 14px); regime title in `font-display`; cap number in `font-display` `tabular-nums` + the `$` example line (compute `amount = round(rent * capPct/100)` for a representative `rent=2000`, label "example"); the verified date as a `shield-check` pill (positive); a finality line keyed off `result.questions.length`; consolidated single honest `confirmLine` (remove the 2 extra amber restatements — keep exactly one). Preserve `notFinalBanner`'s legal content inside the single honest line (do not drop the substance).
- [ ] **Step 4: Run green** — `npm test -- tests/components/resultcard.test.tsx`.
- [ ] **Step 5: Parity + full** — `npm test` (coverage.test.ts confirms EN/ES parity).
- [ ] **Step 6: Commit** — `feat(result): screenshot-worthy ResultCard (rail, eyebrow, finality, $ , verified pill)`.

### Task 6: IncreaseChecker — elevate + icon/word verdict + empty state

**Files:** Modify `components/IncreaseChecker.tsx`, `messages/{en,es}.json`, `tests/components/increasechecker.test.tsx`.

- [ ] **Step 1: Add i18n keys:** `increase.cardTitle` = "Check your specific increase" / "Comprueba tu aumento"; `increase.empty` = "Enter both amounts to see if it's allowed." / "Ingresa ambos montos para ver si está permitido."; `increase.within` = "Within the legal limit" / "Dentro del límite legal"; `increase.over` = "Over the legal limit" / "Por encima del límite legal". (Keep existing verdict strings for detail.)
- [ ] **Step 2: Update test:** assert (a) friendly empty-state text shows before both inputs are filled; (b) an OVER_CAP result renders an `x`/`alert` icon **and** the word "Over the legal limit" (non-color cue); (c) a WITHIN_CAP result renders a `check` icon + "Within the legal limit". Run red.
- [ ] **Step 3: Implement:** wrap in an elevated card (`bg-surface`, `shadow-md`, `rounded-lg`, heading `increase.cardTitle`); bump inputs to `min-h-11`, `border-input`, larger text; add example placeholders (already present); show `increase.empty` when `tone === null` and inputs incomplete; prefix the verdict with an `Icon` + a short word label (`increase.within`/`increase.over`) in addition to the existing detail sentence. Keep the `checkIncrease` real compute untouched.
- [ ] **Step 4: green; Step 5: parity+full; Step 6: Commit** — `feat(result): elevate IncreaseChecker with icon+word verdict and empty state`.

### Task 7: ConfirmingQuestions — mini-wizard (progress + recap + reassurance)

**Files:** Modify `components/ConfirmingQuestions.tsx`, `messages/{en,es}.json`, `tests/components/confirmingquestions.test.tsx`.

- [ ] **Step 1: Add i18n keys:** `question.progress` = "Question {n} of {total}" / "Pregunta {n} de {total}"; `question.reassure` = "Not sure? That's okay — we'll keep your estimate conservative." / "¿No estás seguro? No pasa nada — mantendremos una estimación conservadora." (Keep existing `question.*`.)
- [ ] **Step 2: Update test:** assert the progress label "Question 1 of N" renders, and the reassurance line renders. Run red.
- [ ] **Step 3: Implement:** show `question.progress` per question (index+1 / questions.length), add the `question.reassure` line near the "I'm not sure" option; keep the existing safe-default logic and primary/secondary/unsure structure intact; restyle to the new tokens (`border-input` on buttons that must read as controls, ≥14px text).
- [ ] **Step 4: green; Step 5: parity+full; Step 6: Commit** — `feat(result): ConfirmingQuestions mini-wizard (progress + reassurance)`.

---

# PHASE 3 — First screen (hero, IA, states)

### Task 8: Hero, TrustChips, HowItWorks components

**Files:** Create `components/Hero.tsx`, `components/TrustChips.tsx`, `components/HowItWorks.tsx`; tests `tests/components/{hero,trustchips,howitworks}.test.tsx`; i18n keys in `messages/{en,es}.json`.

- [ ] **Step 1: i18n keys:**
  - `hero.headline` = "You have rights." / "Tienes derechos."
  - `hero.sub` = "Find out which law protects your LA home — and whether your rent increase is legal — from just your address." / es translation.
  - `trust.records` = "Public records" / "Registros públicos"; `trust.updated` = "Updated {date}" / "Actualizado {date}"; `trust.free` = "Free, nothing saved" / "Gratis, no guardamos nada"; `trust.bilingual` = "English / Español".
  - `how.step1/2/3` (EN/ES) for the 3 steps.
- [ ] **Step 2: Failing tests:** each component renders its keyed text; `Hero` renders an `<h1>`/headline with `font-display`; `TrustChips` renders 4 chips each with an `Icon`; `HowItWorks` renders 3 steps.
- [ ] **Step 3: Implement** the three presentational components (props for `date` where needed; all text via `useT`). `Hero` is layout-only (headline + sub); the input/form stays in `page.tsx` and is placed by it. Use the new tokens, `font-display` headline, Lucide icons.
- [ ] **Step 4: green; Step 5: parity+full; Step 6: Commit** — `feat(home): Hero, TrustChips, HowItWorks`.

### Task 9: ResultSkeleton + friendlier error

**Files:** Create `components/ResultSkeleton.tsx`, `tests/components/resultskeleton.test.tsx`; i18n keys for error recovery.

- [ ] **Step 1: i18n keys:** `page.tryAgain` = "Try again" / "Intentar de nuevo"; `page.errorFallback` = "You can also look up your address on the LA County Assessor." / es translation. (Keep existing `page.networkError`/`error.*`.)
- [ ] **Step 2: Failing test:** `ResultSkeleton` renders an element with `aria-hidden` (purely visual) and a `role="status"` sr-only "Loading…". Run red.
- [ ] **Step 3: Implement** a result-shaped skeleton (hero silhouette + lines) using `surface-muted` blocks; gate any shimmer behind `prefers-reduced-motion` (CSS in globals).
- [ ] **Step 4: green; Step 5: Commit** — `feat(home): result-shaped loading skeleton`.

### Task 10: page.tsx — IA reorg (hero ↔ compact header, FAQ below fold, states)

**Files:** Modify `app/page.tsx`. Read it first.

- [ ] **Step 1: Update/extend e2e expectation** in `e2e/lookup.spec.ts` (or add `e2e/home.spec.ts`): on first load the hero headline `hero.headline` is visible and the FAQ heading is NOT in the first viewport (below fold); after a successful lookup the result card appears and a compact header (wordmark + address) shows. (Playwright; run later in Phase 5, but write the spec now.)
- [ ] **Step 2: Failing unit (jsdom) for state wiring** if practical, else rely on e2e. Implement: when `!data && !loading`, render `<Hero/>` + form + `<TrustChips date=.../>` + `<HowItWorks/>`; when `loading`, render `<ResultSkeleton/>`; when `data`, render a compact header (`<Wordmark compact/>` + the looked-up address) above the existing 3-band result; move `<SeoFaq/>` to the bottom under a clear heading for ALL states (so it's below the fold on the home view). Improve the error block: friendly sentence + a "Try again" button (re-runs `run(address, answers)`) + the `errorFallback` link.
- [ ] **Step 3: Build + unit** — `npm run build`, `npm test` green.
- [ ] **Step 4: Commit** — `feat(home): hero-first IA, compact result header, FAQ below the fold, real loading/error states`.

---

# PHASE 4 — Voice & copy (EN + ES) + remaining restyle

### Task 11: Decision-A honesty disclosure (warm wording + relocation)

**Files:** Modify `app/page.tsx`, `components/RecordsDetails.tsx` ("Behind this estimate"), footer/Disclaimer; `messages/{en,es}.json`.

- [ ] **Step 1: i18n keys:** `page.trustLine` (warm) = "A free community tool. We check every figure against LA's official rent laws (updated {date}) — solid information, not legal advice. Always confirm with the housing department." / es translation. `records.aiNote` = "Figures are AI- and statute-checked and pending formal legal-aid review." / es translation. (Keep `page.reviewStatus` key but stop rendering it as the cold top line; relocate its substance into `records.aiNote` within RecordsDetails + keep a short "Not legal advice" in the footer/Disclaimer.)
- [ ] **Step 2: Update tests:** `tests/components/recordsdetails.test.tsx` asserts `records.aiNote` (the AI/pending-review disclosure) is present (substance preserved). A `page` test (or e2e) asserts the cold "pending formal legal-aid review" line is no longer the first text above the input, and the warm `trustLine` appears near the result/footer.
- [ ] **Step 3: Implement** the rewording + relocation. **Do not remove the disclosure** — it moves into "Behind this estimate" + footer and is reworded warmly. Verify `tests/i18n/*` still green.
- [ ] **Step 4: green; Step 5: Commit** — `feat(copy): warmer honest disclosure, relocated (decision A) — substance preserved`.

### Task 12: Acronym expansion, $+%, de-robotize + restyle remaining components

**Files:** `components/{WhatToDoNow,GetHelp,RecordsDetails,Disclaimer,ShareButton,EvictionNotice,SeoFaq,AddressAutocomplete}.tsx`; `messages/{en,es}.json`. Read each component first.

- [ ] **Step 1:** For each component: (a) expand acronyms on first use in its strings (RSO/LAHD/AB 1482/ADU/DCBA) in BOTH catalogs; (b) restyle to new tokens + Lucide icons (replace any text glyphs; `phone`/`map-pin` in GetHelp, `share-2` in ShareButton, `alert-triangle` in EvictionNotice); (c) bump any sub-14px legal/help text to ≥14px; (d) `SeoFaq` gets the demoted heading + calmer styling; (e) `AddressAutocomplete` input uses `border-input` (≥3:1) + `min-h-11`.
- [ ] **Step 2:** Update each component's test for any text/role/icon changes (e.g. `gethelp.test.tsx`, `sharebutton.test.tsx`, `whattodonow.test.tsx`, `recordsdetails.test.tsx`, `evictionnotice.test.tsx`, `seofaq.test.tsx`, `addressautocomplete.test.tsx`). Keep existing assertions about phone numbers/URLs intact (real data). Run red→green per file.
- [ ] **Step 3:** `npm test` full green (incl. i18n parity + the existing AddressAutocomplete combobox ARIA tests).
- [ ] **Step 4: Commit** (can be a few commits, one per component group) — `feat(copy): plain-language + Lucide icons across help/share/eviction/faq/disclaimer`.

### Task 13: i18n parity + ShareButton live-region nit

**Files:** `messages/{en,es}.json`, `components/ShareButton.tsx`, `tests/i18n/coverage.test.ts` (should already cover), `tests/components/sharebutton.test.tsx`.

- [ ] **Step 1:** Run `npm test -- tests/i18n` — fix any EN/ES key gaps from Phases 2–4.
- [ ] **Step 2:** Move ShareButton's `aria-live` off the `<button>` onto a dedicated sr-only `role="status"` element (a11y agent nit); update test. Run red→green.
- [ ] **Step 3: Commit** — `fix(a11y,i18n): EN/ES parity + dedicated share status region`.

---

# PHASE 5 — Accessibility & QA hardening (top priority)

### Task 14: axe-core e2e gate (home + result × light/dark × EN/ES)

**Files:** Create `e2e/a11y.spec.ts`; add dev dep `@axe-core/playwright`.

- [ ] **Step 1:** `npm i -D @axe-core/playwright`.
- [ ] **Step 2: Write `e2e/a11y.spec.ts`:** for the home page and a result page (drive a known RSO address, e.g. "1411 Murray Drive, Los Angeles, CA"), in `en` and `/es`, and in both `colorScheme: 'light'` and `'dark'` (Playwright `test.use({ colorScheme })`), run axe and assert zero `serious`/`critical` violations. Use the existing Playwright config/baseURL.
- [ ] **Step 3: Run** `npm run e2e -- a11y` against a local `npm run build && npm start` (or dev) server. Fix any violations found (contrast, names, roles) at the token/component level.
- [ ] **Step 4: Commit** — `test(a11y): axe e2e across home/result, light/dark, EN/ES`.

### Task 15: Full manual Chrome QA matrix (on Vercel preview)

**Files:** none (verification). Push the branch to get a Vercel preview deployment.

- [ ] **Step 1:** Push branch → open the Vercel **preview** URL.
- [ ] **Step 2:** Drive the matrix with Claude in Chrome, from a renter's perspective, **the whole site in order**:
  - Viewports 320 / 375 / 768 / 1280; light + dark; EN + ES (watch ES wrapping/expansion).
  - Keyboard-only pass (tab order, visible focus); reduced-motion + prefers-contrast.
  - Real addresses per regime: RSO (1411 Murray Dr), AB 1482, LA County (unincorporated), needs-more-info, out-of-jurisdiction; plus a forced network error and the loading skeleton.
  - Confirm `$` examples are labelled and the verified date/honest line read correctly; confirm the honesty disclosure is present (decision A).
  - **Data authenticity:** spot-check that a couple of results match the live `/api/lookup` / Assessor figures (no fabrication).
- [ ] **Step 3:** Log issues, fix, re-verify. Re-run `npm test` + `npm run e2e` green.
- [ ] **Step 4: PSI/Lighthouse:** confirm performance ~100 and accessibility 100 on the preview.

### Task 16: Finish the branch

- [ ] **Step 1:** `npm test` + `npm run e2e` all green; `npm run build` clean.
- [ ] **Step 2:** Announce + use **superpowers:finishing-a-development-branch**; present the 4 options (merge / PR / keep / discard) and execute the user's choice. Default per project workflow: `merge --no-ff` into master, push (auto-deploys to Vercel), then re-verify production.

---

## Self-Review (against the spec)

- **Spec coverage:** tokens (T1), type (T1/T2), icons (T3), brand mark (T4), ResultCard finality+$+rail (T5), IncreaseChecker (T6), ConfirmingQuestions wizard (T7), hero/trust/how-it-works (T8), skeleton/error (T9), IA reorg + FAQ demotion (T10), decision-A disclosure (T11), plain-language + acronym + restyle (T12), i18n parity + share nit (T13), axe gate (T14), Chrome QA matrix + perf (T15), finish (T16). A11y guardrails are enforced by T1 (contrast), T14 (axe), and per-task ≥14px/`border-input`/icon+word rules. **No gaps found.**
- **Placeholder scan:** none — every task names exact files, real test code or concrete assertions, real EN/ES strings, and exact commands.
- **Consistency:** token names (`--border-input`, `--primary-strong`, `--shadow-*`, `--radius*`) and i18n keys are used consistently across tasks; the contrast test's mirror constants must be kept in sync with `globals.css` (called out in T1 Step 4).
