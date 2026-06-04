# M4-C Result Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder and reframe the result so a renter sees a reassuring verdict, then the increase check, then what to do, with the raw records collapsed at the bottom.

**Architecture:** Mostly presentation: slim `ResultCard`, two new small components (`RecordsDetails`, `WhatToDoNow`), an `isCovered` helper, a reordered `app/page.tsx`, and copy changes (loading, dedup "(likely)", banner tone). No engine/data changes.

**Tech Stack:** Next.js 16, React 19, Tailwind, custom flat-key i18n, Vitest (jsdom).

Spec: `docs/superpowers/specs/2026-06-03-rentrights-result-readability-design.md`.

Sequencing keeps tests green at every commit: copy that no test asserts goes first (T1); the banner reframe lands together with the ResultCard test update (T4).

---

## Task 1: i18n — new keys + safe copy changes

**Files:**
- Modify: `messages/en.json`, `messages/es.json`

(`page.loading` and `increase.heading` are not asserted by any test; the "(likely)" titles are matched by regex in tests, so removing the suffix is safe. The banner reframe is deferred to Task 4.)

- [ ] **Step 1: In `messages/en.json`, change these existing values:**

```json
  "page.loading": "Looking up public records…",
```
```json
  "increase.heading": "Is your rent increase legal?",
```
```json
  "rights.RSO.title": "Rent Stabilization Ordinance",
```
```json
  "rights.AB1482.title": "California Tenant Protection Act (AB 1482)",
```
```json
  "rights.COUNTY_RSTPO.title": "LA County Rent Stabilization (RSTPO)",
```

- [ ] **Step 2: In `messages/en.json`, add these new keys** (place near the other `result.*` / add a `whatToDo.*` group):

```json
  "result.reassure": "You have rights — here's what we found for your address.",
  "result.detailsToggle": "See the records behind this estimate",
  "whatToDo.heading": "What you can do now",
  "whatToDo.step1": "Save or screenshot this page.",
  "whatToDo.step2": "Confirm your rights for free — call {agency}: {phone}.",
  "whatToDo.step3": "Get free legal help below.",
```

- [ ] **Step 3: In `messages/es.json`, change the same existing values:**

```json
  "page.loading": "Buscando registros públicos…",
```
```json
  "increase.heading": "¿Es legal el aumento de su renta?",
```
```json
  "rights.RSO.title": "Ordenanza de Estabilización de Rentas",
```
```json
  "rights.AB1482.title": "Ley de Protección al Inquilino de California (AB 1482)",
```
```json
  "rights.COUNTY_RSTPO.title": "Estabilización de Rentas del Condado de LA (RSTPO)",
```

- [ ] **Step 4: In `messages/es.json`, add the new keys:**

```json
  "result.reassure": "Usted tiene derechos — esto es lo que encontramos para su dirección.",
  "result.detailsToggle": "Ver los registros detrás de esta estimación",
  "whatToDo.heading": "Lo que puede hacer ahora",
  "whatToDo.step1": "Guarde o tome una captura de esta página.",
  "whatToDo.step2": "Confirme sus derechos gratis — llame a {agency}: {phone}.",
  "whatToDo.step3": "Obtenga ayuda legal gratuita abajo.",
```

- [ ] **Step 5: Verify parity + full suite still green.**

Run: `npx vitest run tests/i18n/catalog.test.ts && npm test`
Expected: parity PASS; full suite still green (no test asserts the changed strings).

- [ ] **Step 6: Commit.**

```bash
git add messages/en.json messages/es.json
git commit -m "i18n(M4-C): reassure/detailsToggle/whatToDo + loading, dedup likely, increase heading"
```

---

## Task 2: RecordsDetails component

**Files:**
- Create: `components/RecordsDetails.tsx`
- Test: `tests/components/recordsdetails.test.tsx`

- [ ] **Step 1: Write the failing test** `tests/components/recordsdetails.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RecordsDetails } from '@/components/RecordsDetails';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { ReasonItem } from '@/lib/rules/types';

afterEach(cleanup);

function renderDetails(reasons: ReasonItem[]) {
  return render(
    <LocaleProvider initialLocale="en">
      <RecordsDetails reasons={reasons} />
    </LocaleProvider>,
  );
}

describe('RecordsDetails', () => {
  it('renders a closed <details> with the toggle summary and each reason', () => {
    const { container } = renderDetails([
      { code: 'IN_LA_CITY' },
      { code: 'BUILT_BEFORE_CUTOFF', params: { year: 1931 } },
    ]);
    const details = container.querySelector('details');
    expect(details).toBeTruthy();
    expect(details?.hasAttribute('open')).toBe(false);
    expect(screen.getByText('See the records behind this estimate')).toBeTruthy();
    expect(screen.getByText(/In the City of Los Angeles/)).toBeTruthy();
    expect(screen.getByText(/Built in 1931/)).toBeTruthy();
  });

  it('renders nothing when there are no reasons', () => {
    const { container } = renderDetails([]);
    expect(container.querySelector('details')).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/components/recordsdetails.test.tsx` → expect FAIL (component missing).

- [ ] **Step 3: Create `components/RecordsDetails.tsx`:**

```tsx
'use client';
import { ReasonItem } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';

export function RecordsDetails({ reasons }: { reasons: ReasonItem[] }) {
  const t = useT();
  if (reasons.length === 0) return null;
  return (
    <details className="mt-4 rounded-xl border border-gray-200 p-3">
      <summary className="cursor-pointer text-sm text-gray-600">{t('result.detailsToggle')}</summary>
      <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
        {reasons.map((r, i) => (
          <li key={i}>{t(`reason.${r.code}`, r.params)}</li>
        ))}
      </ul>
    </details>
  );
}
```

- [ ] **Step 4: Run** `npx vitest run tests/components/recordsdetails.test.tsx && npx tsc --noEmit` → expect PASS.

- [ ] **Step 5: Commit.**

```bash
git add components/RecordsDetails.tsx tests/components/recordsdetails.test.tsx
git commit -m "feat(ui): RecordsDetails — collapsible 'records behind this estimate'"
```

---

## Task 3: `isCovered` helper + WhatToDoNow component

**Files:**
- Modify: `lib/content/rights.ts`
- Test: `tests/content/rights.test.ts`
- Create: `components/WhatToDoNow.tsx`
- Test: `tests/components/whattodonow.test.tsx`

- [ ] **Step 1: Write the failing helper test.** Append to `tests/content/rights.test.ts` (add `isCovered` to the existing `@/lib/content/rights` import):

```ts
describe('isCovered', () => {
  it('is true for in-jurisdiction regimes', () => {
    for (const r of ['RSO', 'AB1482', 'JCO_ONLY', 'COUNTY_RSTPO', 'COUNTY_JCO'] as const) {
      expect(isCovered(r)).toBe(true);
    }
  });
  it('is false for OOJ and UNKNOWN', () => {
    expect(isCovered('OUT_OF_JURISDICTION')).toBe(false);
    expect(isCovered('UNKNOWN')).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/content/rights.test.ts` → expect FAIL (`isCovered` not exported).

- [ ] **Step 3: Add `isCovered` to `lib/content/rights.ts`** (near the top, after the imports):

```ts
// Regimes where we have an actual protection to report (vs OOJ / not-enough-info).
const COVERED_REGIMES: Regime[] = ['RSO', 'AB1482', 'JCO_ONLY', 'COUNTY_RSTPO', 'COUNTY_JCO'];
export function isCovered(regime: Regime): boolean {
  return COVERED_REGIMES.includes(regime);
}
```

- [ ] **Step 4: Run** `npx vitest run tests/content/rights.test.ts` → expect PASS.

- [ ] **Step 5: Write the failing component test** `tests/components/whattodonow.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WhatToDoNow } from '@/components/WhatToDoNow';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { Regime } from '@/lib/rules/types';

afterEach(cleanup);

function renderWtd(regime: Regime) {
  return render(
    <LocaleProvider initialLocale="en">
      <WhatToDoNow regime={regime} />
    </LocaleProvider>,
  );
}

describe('WhatToDoNow', () => {
  it('shows three steps and routes a city regime to LAHD', () => {
    renderWtd('RSO');
    expect(screen.getByText('What you can do now')).toBeTruthy();
    expect(screen.getByText('Save or screenshot this page.')).toBeTruthy();
    const step2 = screen.getByText(/Confirm your rights for free/);
    expect(step2.textContent).toContain('LAHD');
    expect(step2.textContent).toContain('(866) 557-7368');
    expect(screen.getByText('Get free legal help below.')).toBeTruthy();
  });

  it('routes a County regime to LA County DCBA', () => {
    renderWtd('COUNTY_RSTPO');
    const step2 = screen.getByText(/Confirm your rights for free/);
    expect(step2.textContent).toContain('DCBA');
    expect(step2.textContent).toContain('(800) 593-8222');
  });
});
```

- [ ] **Step 6: Run** `npx vitest run tests/components/whattodonow.test.tsx` → expect FAIL (component missing).

- [ ] **Step 7: Create `components/WhatToDoNow.tsx`:**

```tsx
'use client';
import { Regime } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';
import { cityAuthority, countyAuthority } from '@/lib/content/help';

export function WhatToDoNow({ regime }: { regime: Regime }) {
  const t = useT();
  const isCounty = regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO';
  const auth = isCounty ? countyAuthority : cityAuthority;
  const agency = isCounty ? t('staleness.authority.dcba') : t('staleness.authority.lahd');
  return (
    <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">{t('whatToDo.heading')}</p>
      <ol className="mt-1 list-decimal pl-5 text-sm text-amber-900">
        <li>{t('whatToDo.step1')}</li>
        <li>{t('whatToDo.step2', { agency, phone: auth.phone ?? '' })}</li>
        <li>{t('whatToDo.step3')}</li>
      </ol>
    </section>
  );
}
```

- [ ] **Step 8: Run** `npx vitest run tests/components/whattodonow.test.tsx && npx tsc --noEmit` → expect PASS.

- [ ] **Step 9: Commit.**

```bash
git add lib/content/rights.ts tests/content/rights.test.ts components/WhatToDoNow.tsx tests/components/whattodonow.test.tsx
git commit -m "feat(ui): isCovered helper + WhatToDoNow (regime-aware next steps)"
```

---

## Task 4: Slim ResultCard + reassurance + banner reframe

**Files:**
- Modify: `components/ResultCard.tsx`
- Modify: `messages/en.json`, `messages/es.json` (banner copy)
- Test: `tests/components/resultcard.test.tsx`

- [ ] **Step 1: Reframe the banner copy.** In `messages/en.json` change:

```json
  "result.notFinal": "This is a free estimate. Confirm your rights for free with {agency}: {phone}.",
  "result.notFinalGeneric": "This is a free estimate. Confirm your rights with your local rent/housing authority.",
```

In `messages/es.json` change:

```json
  "result.notFinal": "Esta es una estimación gratuita. Confirme sus derechos gratis con {agency}: {phone}.",
  "result.notFinalGeneric": "Esta es una estimación gratuita. Confirme sus derechos con su autoridad local de vivienda/renta.",
```

- [ ] **Step 2: Update the ResultCard test** `tests/components/resultcard.test.tsx` to the new structure (reassurance present, reasons gone, reframed banner). Replace the whole file with:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { RegimeResult } from '@/lib/rules/types';

afterEach(cleanup);

function renderCard(result: RegimeResult) {
  return render(
    <LocaleProvider initialLocale="en">
      <ResultCard result={result} />
    </LocaleProvider>,
  );
}

describe('ResultCard', () => {
  it('renders an RSO result: reassurance, title (no "(likely)" dup), confidence, cap, and banner — but NOT the raw records', () => {
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [
        { code: 'IN_LA_CITY' },
        { code: 'BUILT_BEFORE_CUTOFF', params: { year: 1931 } },
        { code: 'UNITS_COUNT', params: { count: 6 } },
      ],
      questions: [],
    });
    expect(screen.getByText(/You have rights/)).toBeTruthy();
    expect(screen.getByText(/Rent Stabilization Ordinance/)).toBeTruthy();
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByText(/Legal annual increase/)).toBeTruthy();
    // Records moved to RecordsDetails — not in the card anymore.
    expect(screen.queryByText(/Built in 1931/)).toBeNull();
    expect(screen.queryByText(/6 units on the parcel/)).toBeNull();
    // Reframed banner keeps the regime phone.
    expect(screen.getByText(/free estimate/i).textContent).toContain('(866) 557-7368');
  });

  it('routes the banner to LA County DCBA for County regimes', () => {
    renderCard({
      regime: 'COUNTY_RSTPO',
      confidence: 'high',
      reasons: [{ code: 'UNINCORPORATED_COUNTY' }],
      questions: [],
    });
    const banner = screen.getByText(/free estimate/i).textContent ?? '';
    expect(banner).toContain('DCBA');
    expect(banner).toContain('(800) 593-8222');
    expect(banner).not.toContain('(866) 557-7368');
  });

  it('hides reassurance, confidence, and cap for OUT_OF_JURISDICTION', () => {
    renderCard({
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: 'West Hollywood city' } }],
      questions: [],
    });
    expect(screen.getByText(/Outside the City of Los Angeles/)).toBeTruthy();
    expect(screen.queryByText(/You have rights/)).toBeNull();
    expect(screen.queryByText('High confidence')).toBeNull();
    expect(screen.queryByText(/Legal annual increase/)).toBeNull();
    const banner = screen.getByText(/free estimate/i).textContent ?? '';
    expect(banner).not.toContain('(866) 557-7368');
    expect(banner).not.toContain('(800) 593-8222');
  });
});
```

- [ ] **Step 3: Run** `npx vitest run tests/components/resultcard.test.tsx` → expect FAIL (old ResultCard still renders records + has no reassurance).

- [ ] **Step 4: Rewrite `components/ResultCard.tsx`:**

```tsx
'use client';
import { RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, capStaleness, stalenessMessage, notFinalBanner, isCovered } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';

export function ResultCard({ result }: { result: RegimeResult }) {
  const t = useT();
  const rights = rightsText(result.regime, t);
  const detailed = result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN';
  return (
    <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
      {isCovered(result.regime) && (
        <p className="mb-2 text-sm font-medium text-green-700">{t('result.reassure')}</p>
      )}
      <p className="text-lg font-bold">{t('result.likelyPrefix')} {rights.title}</p>
      {detailed && (
        <>
          <span className="mt-1 inline-block rounded-full border border-green-700 bg-green-50 px-3 py-0.5 text-xs font-semibold text-green-700">
            {t(`result.confidence.${result.confidence}`)}
          </span>
          <p className="mt-3 text-sm text-gray-500">{t('result.legalIncrease')}</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime, t)}</p>
          {(() => {
            const s = capStaleness(result.regime);
            return s?.stale ? <p className="mt-1 text-xs text-gray-400">⚠ {stalenessMessage(s, t, result.regime)}</p> : null;
          })()}
        </>
      )}
      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
        {rights.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
        {notFinalBanner(result.regime, t)}
      </div>
    </div>
  );
}
```

(Removed: the `result.whatRecordsShow` label and the `result.reasons` list. Added: the reassurance line gated by `isCovered`.)

- [ ] **Step 5: Run** `npx vitest run tests/components/resultcard.test.tsx tests/content/rights.test.ts && npx tsc --noEmit` → expect PASS (the `notFinalBanner` tests in rights.test still pass — reframed copy still contains the agency name + phone).

- [ ] **Step 6: Commit.**

```bash
git add components/ResultCard.tsx messages/en.json messages/es.json tests/components/resultcard.test.tsx
git commit -m "feat(ui): slim ResultCard (records out, reassurance in) + empowerment banner copy"
```

---

## Task 5: Reorder the result on the home page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports** near the other component imports in `app/page.tsx`:

```tsx
import { WhatToDoNow } from '@/components/WhatToDoNow';
import { RecordsDetails } from '@/components/RecordsDetails';
import { isCovered } from '@/lib/content/rights';
```

- [ ] **Step 2: Replace the result block.** Find:

```tsx
      {data && (
        <div className="mt-6">
          <ResultCard result={data.result} />
          <IncreaseChecker regime={data.result.regime} />
          {data.result.questions.length > 0 && (
            <ConfirmingQuestions
              questions={data.result.questions}
              answers={answers}
              onAnswer={(next) => { setAnswers(next); run(address, next); }}
            />
          )}
          {data.dataWarnings?.map((w: string, i: number) => (
            <p key={i} className="mt-3 text-xs text-gray-500">{t(`warning.${w}`)}</p>
          ))}
          <ShareButton address={address} answers={answers} locale={locale} />
          <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null} />
          <Disclaimer lastVerified={data.lastVerified} />
        </div>
      )}
```

and replace it with (verdict → increase check → what to do → questions → warnings → help → records → share → disclaimer):

```tsx
      {data && (
        <div className="mt-6">
          <ResultCard result={data.result} />
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
            <p key={i} className="mt-3 text-xs text-gray-500">{t(`warning.${w}`)}</p>
          ))}
          <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null} />
          <RecordsDetails reasons={data.result.reasons} />
          <ShareButton address={address} answers={answers} locale={locale} />
          <Disclaimer lastVerified={data.lastVerified} />
        </div>
      )}
```

- [ ] **Step 3: Verify build + full suite.**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc clean; all tests pass; build OK.

- [ ] **Step 4: Commit.**

```bash
git add app/page.tsx
git commit -m "feat(ui): reorder result — verdict, increase check, next steps; records collapsed at bottom"
```

---

## Task 6: Full verification + Chrome QA

**Files:** none.

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run build` → all green.

- [ ] **Step 2: Chrome QA** (standing constraint). `npm run start -- -p 3005`, then in Chrome:
  - Look up a covered address (e.g. `846 S Broadway, Los Angeles` via autocomplete) → verify order: reassurance ("You have rights…") + verdict (title with NO "(likely)") → "Is your rent increase legal?" checker → "What you can do now" (3 steps, LAHD (866) 557-7368) → Get free help → a collapsible "See the records behind this estimate" (closed) that expands to show Built 1927 / 37 units → disclaimer. Banner reads "This is a free estimate. Confirm your rights for free with LAHD: (866) 557-7368."
  - During the lookup, the Check button shows "Looking up public records…".
  - A County address → WhatToDoNow + banner show LA County DCBA (800) 593-8222.
  - OUT_OF_JURISDICTION (e.g. West Hollywood) → no reassurance, no WhatToDoNow, no increase checker; records still collapsible.
  - Toggle Español → reassurance, steps, toggle, loading, banner all localized.

- [ ] **Step 3: Stop the QA server** (Stop-Process the 3005 listener).

---

## Self-review notes
- Spec coverage: reorder (T5), slim ResultCard + reassurance (T4), RecordsDetails collapsible (T2), WhatToDoNow + isCovered (T3), banner reframe (T4), dedup "(likely)" + loading + increase heading (T1), i18n EN+ES (T1/T4), tests + Chrome QA EN/ES (T6). All spec sections mapped.
- Placeholder scan: none.
- Type consistency: `isCovered(regime: Regime)` defined in T3, used in ResultCard (T4) and page.tsx (T5); `RecordsDetails` takes `reasons: ReasonItem[]` (T2) matching `data.result.reasons` (T5); `WhatToDoNow` takes `regime: Regime` (T3) matching the call site (T5); `whatToDo.step2` uses `{agency}`/`{phone}` params consistently in catalog (T1) and component (T3). Banner copy (T4) keeps `{agency} {phone}`, so `notFinalBanner` code is unchanged and its existing rights.test assertions (agency name + phone substrings) still hold.
- Green-at-commit: T1 changes only un-asserted/regex-safe strings; the banner reframe (T4) is committed together with the updated resultcard.test.
