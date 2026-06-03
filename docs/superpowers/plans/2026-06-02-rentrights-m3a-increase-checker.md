# RentRights M3-A — Rent-Increase Legality Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a renter enter their current rent and a proposed new rent and instantly see whether the increase is within or over the legal cap for their determined regime — using only the verified, dated `LEGAL` cap constants.

**Architecture:** A pure `checkIncrease()` reads the regime's dated cap from `LEGAL` (single source of truth — no new/hardcoded figures) and returns a verdict + allowed-max. A client `IncreaseChecker` renders the inputs and the live verdict via `useT()`. Rendered in the result block for cap regimes; a "no cap" note for JCO-only; nothing for out-of-jurisdiction/unknown.

**Tech Stack:** Next.js 16, TypeScript, Vitest (+ RTL/jsdom), Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-m3a-increase-checker-design.md`

**Data principle (memory: rentrights-real-accurate-data):** cap % comes ONLY from `LEGAL.rsoCapPct`/`LEGAL.ab1482CapPct` (dated, with `lastVerified`). Tests derive expectations from those verified figures; E2E uses a real address + live APIs.

**Conventions:** alias `@/*` = repo root. Tests under `tests/`, E2E under `e2e/`. Commit after every green step. Branch `m3a-increase-checker` (created). After each task: `npx tsc --noEmit` + (for vitest tasks) `npm test`.

**Verified `LEGAL` shape (do not change here):**
- `LEGAL.rsoCapPct = [ { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', ... }, { value: null, floorPct: 1, ceilingPct: 4, effectiveFrom: '2026-07-01', ... } ]`
- `LEGAL.ab1482CapPct = [ { value: 8.0, effectiveFrom: '2025-08-01', effectiveTo: '2026-07-31', ... }, { value: 8.7, effectiveFrom: '2026-08-01', effectiveTo: '2027-07-31', ... } ]`
- `Regime = 'RSO' | 'AB1482' | 'JCO_ONLY' | 'OUT_OF_JURISDICTION' | 'UNKNOWN'`.

---

## File Structure

- `lib/rules/increase.ts` — CREATE: `checkIncrease()` (pure)
- `components/IncreaseChecker.tsx` — CREATE: client checker UI
- `app/page.tsx` — MODIFY: render `<IncreaseChecker>` in the result block
- `messages/en.json`, `messages/es.json` — MODIFY: `increase.*` keys
- `tests/rules/increase.test.ts` — CREATE
- `tests/components/increasechecker.test.tsx` — CREATE
- `e2e/increase.spec.ts` — CREATE

---

## Task 1: Pure `checkIncrease` module

**Files:**
- Create: `lib/rules/increase.ts`
- Test: `tests/rules/increase.test.ts`

- [ ] **Step 1: Write the failing tests (expectations derived from verified LEGAL caps)**

Create `tests/rules/increase.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { checkIncrease } from '@/lib/rules/increase';

const NOW = new Date('2026-06-02'); // RSO 3%, AB1482 8.0%
const PENDING = new Date('2026-08-01'); // RSO new-formula (value null, floor 1 / ceiling 4)

describe('checkIncrease', () => {
  it('RSO 3%: within cap', () => {
    const r = checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2050, onDate: NOW });
    expect(r.verdict).toBe('WITHIN_CAP');
    expect(r.capPct).toBe(3);
    expect(r.allowedMaxRent).toBe(2060);
  });

  it('RSO 3%: over cap', () => {
    const r = checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2200, onDate: NOW });
    expect(r.verdict).toBe('OVER_CAP');
    expect(r.allowedMaxRent).toBe(2060);
  });

  it('AB1482 8%: within and over', () => {
    expect(checkIncrease({ regime: 'AB1482', currentRent: 2000, proposedRent: 2100, onDate: NOW }).verdict).toBe('WITHIN_CAP');
    const over = checkIncrease({ regime: 'AB1482', currentRent: 2000, proposedRent: 2300, onDate: NOW });
    expect(over.verdict).toBe('OVER_CAP');
    expect(over.allowedMaxRent).toBe(2160);
  });

  it('RSO pending range: within / over / uncertain', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2010, onDate: PENDING }).verdict).toBe('WITHIN_RANGE');
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2100, onDate: PENDING }).verdict).toBe('OVER_RANGE');
    const u = checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2050, onDate: PENDING });
    expect(u.verdict).toBe('UNCERTAIN_RANGE');
    expect(u.allowedMaxAtFloor).toBe(2020);
    expect(u.allowedMaxAtCeiling).toBe(2080);
  });

  it('JCO_ONLY: no cap', () => {
    expect(checkIncrease({ regime: 'JCO_ONLY', currentRent: 2000, proposedRent: 9999, onDate: NOW }).verdict).toBe('NO_CAP');
  });

  it('out of jurisdiction / unknown: not applicable', () => {
    expect(checkIncrease({ regime: 'OUT_OF_JURISDICTION', currentRent: 2000, proposedRent: 2100, onDate: NOW }).verdict).toBe('NOT_APPLICABLE');
    expect(checkIncrease({ regime: 'UNKNOWN', currentRent: 2000, proposedRent: 2100, onDate: NOW }).verdict).toBe('NOT_APPLICABLE');
  });

  it('invalid input: needs input', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 0, proposedRent: 2100, onDate: NOW }).verdict).toBe('NEEDS_INPUT');
    expect(checkIncrease({ regime: 'RSO', currentRent: NaN, proposedRent: 2100, onDate: NOW }).verdict).toBe('NEEDS_INPUT');
  });

  it('computes the proposed increase percentage', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2200, onDate: NOW }).proposedPct).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/rules/increase.test.ts`
Expected: FAIL — cannot find module `@/lib/rules/increase`.

- [ ] **Step 3: Implement the module**

Create `lib/rules/increase.ts`:
```ts
import { LEGAL } from '@/lib/legal/constants';
import { Regime } from './types';

export type IncreaseVerdict =
  | 'WITHIN_CAP'
  | 'OVER_CAP'
  | 'WITHIN_RANGE'
  | 'OVER_RANGE'
  | 'UNCERTAIN_RANGE'
  | 'NO_CAP'
  | 'NEEDS_INPUT'
  | 'NOT_APPLICABLE';

export interface IncreaseResult {
  verdict: IncreaseVerdict;
  capPct?: number;
  capFloorPct?: number;
  capCeilingPct?: number;
  allowedMaxRent?: number;
  allowedMaxAtFloor?: number;
  allowedMaxAtCeiling?: number;
  proposedPct?: number;
}

export interface CheckIncreaseInput {
  regime: Regime;
  currentRent: number;
  proposedRent: number;
  onDate?: Date;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round1 = (x: number) => Math.round(x * 10) / 10;

export function checkIncrease({ regime, currentRent, proposedRent, onDate = new Date() }: CheckIncreaseInput): IncreaseResult {
  if (regime !== 'RSO' && regime !== 'AB1482' && regime !== 'JCO_ONLY') {
    return { verdict: 'NOT_APPLICABLE' };
  }
  if (regime === 'JCO_ONLY') return { verdict: 'NO_CAP' };
  if (!Number.isFinite(currentRent) || !Number.isFinite(proposedRent) || currentRent <= 0 || proposedRent < 0) {
    return { verdict: 'NEEDS_INPUT' };
  }

  const d = onDate.toISOString().slice(0, 10);
  const period =
    regime === 'RSO'
      ? LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo))
      : LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
  if (!period) return { verdict: 'NOT_APPLICABLE' };

  const proposedPct = round1(((proposedRent - currentRent) / currentRent) * 100);

  if (period.value != null) {
    const capPct = period.value;
    const allowedMaxRent = round2(currentRent * (1 + capPct / 100));
    return {
      verdict: proposedRent <= allowedMaxRent ? 'WITHIN_CAP' : 'OVER_CAP',
      capPct,
      allowedMaxRent,
      proposedPct,
    };
  }

  // Pending RSO new-formula period: value is null, floor/ceiling define the range.
  const floor = 'floorPct' in period && period.floorPct != null ? period.floorPct : 1;
  const ceiling = 'ceilingPct' in period && period.ceilingPct != null ? period.ceilingPct : 4;
  const allowedMaxAtFloor = round2(currentRent * (1 + floor / 100));
  const allowedMaxAtCeiling = round2(currentRent * (1 + ceiling / 100));
  let verdict: IncreaseVerdict;
  if (proposedRent <= allowedMaxAtFloor) verdict = 'WITHIN_RANGE';
  else if (proposedRent > allowedMaxAtCeiling) verdict = 'OVER_RANGE';
  else verdict = 'UNCERTAIN_RANGE';
  return { verdict, capFloorPct: floor, capCeilingPct: ceiling, allowedMaxAtFloor, allowedMaxAtCeiling, proposedPct };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/rules/increase.test.ts`
Expected: PASS (8 passed).

- [ ] **Step 5: Run full suite + tsc**

Run: `npm test` then `npx tsc --noEmit`
Expected: all green, tsc clean.

- [ ] **Step 6: Commit**
```powershell
git add lib/rules/increase.ts tests/rules/increase.test.ts
git commit -m "feat(rules): pure checkIncrease (cap comparison from dated LEGAL constants)"
```

---

## Task 2: `increase.*` i18n keys

**Files:**
- Modify: `messages/en.json`, `messages/es.json`

- [ ] **Step 1: Add the English keys**

In `messages/en.json`, add these keys (flat object; comma after the previous last entry, no trailing comma):
```json
  "increase.heading": "Check a proposed increase",
  "increase.currentLabel": "Current monthly rent",
  "increase.currentPlaceholder": "e.g. 2000",
  "increase.proposedLabel": "Proposed new rent",
  "increase.proposedPlaceholder": "e.g. 2200",
  "increase.verdict.withinCap": "✓ Within the legal cap. The most they can legally charge is about {max} (a {pct}% cap).",
  "increase.verdict.overCap": "⚠ Over the legal cap. The most they can legally charge is about {max} (a {pct}% cap).",
  "increase.verdict.withinRange": "✓ Likely within the legal range. The cap is being updated — the legal max is about {floorMax}–{ceilingMax}. Confirm the exact figure with LAHD.",
  "increase.verdict.overRange": "⚠ Likely over the legal cap. Even at the high end the legal max is about {ceilingMax}. Confirm with LAHD.",
  "increase.verdict.uncertainRange": "The cap is being updated (LAHD publishes the exact %). The legal max is about {floorMax}–{ceilingMax}, and your proposed rent is in that range — confirm with LAHD.",
  "increase.noCap": "Your unit isn’t under a rent cap, so there’s no maximum increase amount — but Just Cause and notice rules still apply.",
  "increase.caveat": "Estimate only — confirm with LAHD before acting."
```

- [ ] **Step 2: Add the Spanish keys**

In `messages/es.json`, add the matching keys:
```json
  "increase.heading": "Verifique un aumento propuesto",
  "increase.currentLabel": "Renta mensual actual",
  "increase.currentPlaceholder": "p. ej. 2000",
  "increase.proposedLabel": "Nueva renta propuesta",
  "increase.proposedPlaceholder": "p. ej. 2200",
  "increase.verdict.withinCap": "✓ Dentro del tope legal. Lo máximo que pueden cobrar legalmente es aproximadamente {max} (tope del {pct}%).",
  "increase.verdict.overCap": "⚠ Por encima del tope legal. Lo máximo que pueden cobrar legalmente es aproximadamente {max} (tope del {pct}%).",
  "increase.verdict.withinRange": "✓ Probablemente dentro del rango legal. El tope se está actualizando — el máximo legal es aproximadamente {floorMax}–{ceilingMax}. Confirme la cifra exacta con LAHD.",
  "increase.verdict.overRange": "⚠ Probablemente por encima del tope legal. Incluso en el extremo alto, el máximo legal es aproximadamente {ceilingMax}. Confirme con LAHD.",
  "increase.verdict.uncertainRange": "El tope se está actualizando (LAHD publica el % exacto). El máximo legal es aproximadamente {floorMax}–{ceilingMax}, y su renta propuesta está en ese rango — confirme con LAHD.",
  "increase.noCap": "Su unidad no tiene tope de renta, así que no hay un monto máximo de aumento — pero las reglas de Causa Justa y de aviso siguen aplicando.",
  "increase.caveat": "Solo una estimación — confirme con LAHD antes de actuar."
```

- [ ] **Step 3: Verify parity + suite**

Run: `npx vitest run tests/i18n/catalog.test.ts` then `npm test` then `npx tsc --noEmit`
Expected: catalog completeness (en==es keys) passes; full suite green; tsc clean.

- [ ] **Step 4: Commit**
```powershell
git add messages/en.json messages/es.json
git commit -m "feat(i18n): increase.* catalog keys (en/es)"
```

---

## Task 3: `IncreaseChecker` component + component test

**Files:**
- Create: `components/IncreaseChecker.tsx`
- Test: `tests/components/increasechecker.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `tests/components/increasechecker.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

describe('IncreaseChecker', () => {
  it('flags an over-cap increase for an RSO unit', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="RSO" />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2200' } });
    expect(screen.getByText(/Over the legal cap/i)).toBeTruthy();
  });

  it('shows a no-cap note for JCO_ONLY', () => {
    render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="JCO_ONLY" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/no maximum increase amount/i)).toBeTruthy();
  });

  it('renders nothing for out-of-jurisdiction', () => {
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <IncreaseChecker regime="OUT_OF_JURISDICTION" />
      </LocaleProvider>,
    );
    expect(container.querySelector('section')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/increasechecker.test.tsx`
Expected: FAIL — cannot find module `@/components/IncreaseChecker`.

- [ ] **Step 3: Implement the component**

Create `components/IncreaseChecker.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { Regime } from '@/lib/rules/types';
import { checkIncrease } from '@/lib/rules/increase';
import { useT } from '@/lib/i18n/LocaleProvider';

function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function IncreaseChecker({ regime }: { regime: Regime }) {
  const t = useT();
  const [current, setCurrent] = useState('');
  const [proposed, setProposed] = useState('');

  if (regime === 'OUT_OF_JURISDICTION' || regime === 'UNKNOWN') return null;

  if (regime === 'JCO_ONLY') {
    return (
      <section className="mt-6">
        <h2 className="text-sm font-semibold">{t('increase.heading')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('increase.noCap')}</p>
      </section>
    );
  }

  const r = checkIncrease({ regime, currentRent: parseFloat(current), proposedRent: parseFloat(proposed) });

  let tone: 'ok' | 'bad' | 'warn' | null = null;
  let text: string | null = null;
  switch (r.verdict) {
    case 'WITHIN_CAP':
      tone = 'ok';
      text = t('increase.verdict.withinCap', { max: money(r.allowedMaxRent!), pct: r.capPct! });
      break;
    case 'OVER_CAP':
      tone = 'bad';
      text = t('increase.verdict.overCap', { max: money(r.allowedMaxRent!), pct: r.capPct! });
      break;
    case 'WITHIN_RANGE':
      tone = 'ok';
      text = t('increase.verdict.withinRange', { floorMax: money(r.allowedMaxAtFloor!), ceilingMax: money(r.allowedMaxAtCeiling!) });
      break;
    case 'OVER_RANGE':
      tone = 'bad';
      text = t('increase.verdict.overRange', { ceilingMax: money(r.allowedMaxAtCeiling!) });
      break;
    case 'UNCERTAIN_RANGE':
      tone = 'warn';
      text = t('increase.verdict.uncertainRange', { floorMax: money(r.allowedMaxAtFloor!), ceilingMax: money(r.allowedMaxAtCeiling!) });
      break;
    default:
      tone = null; // NEEDS_INPUT / NOT_APPLICABLE → show nothing
  }

  const toneClass = tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : 'text-green-700';

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">{t('increase.heading')}</h2>
      <div className="mt-2 flex gap-2">
        <label className="flex-1 text-xs text-gray-600">
          {t('increase.currentLabel')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t('increase.currentPlaceholder')}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="flex-1 text-xs text-gray-600">
          {t('increase.proposedLabel')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={proposed}
            onChange={(e) => setProposed(e.target.value)}
            placeholder={t('increase.proposedPlaceholder')}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
      </div>
      {text && <p className={`mt-2 text-sm font-semibold ${toneClass}`}>{text}</p>}
      {text && <p className="mt-1 text-xs text-gray-500">{t('increase.caveat')}</p>}
    </section>
  );
}
```
> Note: `getByLabelText('Current monthly rent')` works because each `<input>` is nested inside its `<label>`. With empty inputs `parseFloat('')` is `NaN` → `checkIncrease` returns `NEEDS_INPUT` → no verdict shown.

- [ ] **Step 4: Run the component test + full suite + tsc**

Run: `npx vitest run tests/components/increasechecker.test.tsx` then `npm test` then `npx tsc --noEmit`
Expected: 3 passed; full suite green; tsc clean.

- [ ] **Step 5: Commit**
```powershell
git add components/IncreaseChecker.tsx tests/components/increasechecker.test.tsx
git commit -m "feat(ui): IncreaseChecker component (live cap verdict)"
```

---

## Task 4: Page integration + E2E

**Files:**
- Modify: `app/page.tsx`
- Create: `e2e/increase.spec.ts`

- [ ] **Step 1: Wire the checker into the page**

In `app/page.tsx`, add the import (with the other component imports):
```tsx
import { IncreaseChecker } from '@/components/IncreaseChecker';
```
In the `{data && ( ... )}` result block, add the checker right after `<ResultCard result={data.result} />`. Change:
```tsx
          <ResultCard result={data.result} />
```
to:
```tsx
          <ResultCard result={data.result} />
          <IncreaseChecker regime={data.result.regime} />
```

- [ ] **Step 2: Build to confirm it compiles**

Run: `npm run build` then `npx tsc --noEmit`
Expected: build succeeds, tsc clean.

- [ ] **Step 3: Create the E2E spec (live, real address, date-stable)**

Create `e2e/increase.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('flags an over-cap increase on a real RSO address', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();

  // 2000 -> 2200 is a 10% increase: over the RSO 3% cap AND over the pending 1–4% range,
  // so the "over" verdict is date-stable.
  await page.getByLabel('Current monthly rent').fill('2000');
  await page.getByLabel('Proposed new rent').fill('2200');
  await expect(page.getByText(/over the legal cap/i)).toBeVisible();
});
```

- [ ] **Step 4: Verify E2E discovery + offline suite + tsc**

Run: `npx playwright test --list` (expect 7 tests total now: 6 prior + 1 increase) then `npx tsc --noEmit` then `npm test`
Expected: 7 tests listed; tsc clean; offline suite green.

- [ ] **Step 5: Commit**
```powershell
git add app/page.tsx e2e/increase.spec.ts
git commit -m "feat(ui): render IncreaseChecker in result + live E2E"
```

---

## Task 5: Full verification + finish

**Files:** none (verification + branch completion)

- [ ] **Step 1: Offline suite + types + build**

Run: `npm test` then `npx tsc --noEmit` then `npm run build`
Expected: all Vitest green (incl. new increase unit + component tests); tsc clean; build succeeds (`/` dynamic).

- [ ] **Step 2: Run the live E2E suite**

First free port 3000 if needed (`Get-NetTCPConnection -LocalPort 3000 | Stop-Process` the owning PID; Next 16 allows one server per dir; do NOT use `next dev` — it's broken on this machine, the Playwright webServer uses `next build && next start`). Then run: `npm run e2e`
Expected: all 7 E2E tests pass against live Census/Assessor APIs (the new increase test asserts the date-stable "over the legal cap" verdict). Transient external-API timeouts may retry; a genuine assertion failure should stop and be reported.

- [ ] **Step 3: Smoke Claude-in-Chrome check (standing requirement; memory rentrights-full-site-chrome-qa)**

Production server (`npm run build && npx next start -p 3000`), fresh tab, load `http://localhost:3000`: run `1411 Murray Dr, Los Angeles, CA`, then in the new **Check a proposed increase** section enter current `2000` / proposed `2050` → expect a "within the legal cap" (green) verdict, and `2200` → expect an "over the legal cap" (red) verdict. Screenshot both. (Use element refs, not pixel coords; this confirms the real rendered verdict with real data.)

- [ ] **Step 4: Complete the development branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, present merge/PR/keep/discard options, and execute the choice.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §2.1 pure `checkIncrease` (verdicts, dated cap from LEGAL, pending range) → Task 1. §2.4 i18n → Task 2. §2.2 `IncreaseChecker` (RSO/AB1482 form, JCO no-cap, OOJ/UNKNOWN null, live verdict, caveat) → Task 3. §2.3 page render → Task 4. §5 tests: unit (verified-figure expectations) → Task 1; component → Task 3; live E2E real address → Task 4; full verify incl. real-data Chrome smoke → Task 5. Data principle (cap only from LEGAL) honored — no hardcoded cap numbers anywhere in `increase.ts`.
- **Placeholder scan:** No TBD/TODO. All code/JSON complete. Test expectations (2060, 2160, 2020/2080, 10%) are derived from the verified LEGAL caps (3%, 8%, floor1/ceiling4), not invented.
- **Type consistency:** `checkIncrease({regime,currentRent,proposedRent,onDate?}): IncreaseResult` signature identical across module/tests/component. `IncreaseVerdict` members used consistently. `IncreaseChecker({regime: Regime})` prop matches the page call `regime={data.result.regime}`. i18n keys referenced in the component (`increase.heading/currentLabel/proposedLabel/currentPlaceholder/proposedPlaceholder/verdict.*/noCap/caveat`) exactly match the keys added in Task 2. The `'floorPct' in period` narrowing avoids the union-array type error (rsoCapPct vs ab1482CapPct have different element types — selecting the array inside the regime branch keeps `.find` single-typed).
- **Date-stability:** unit tests inject `onDate`; the E2E uses a 10% increase that is "over" in both the 3% era and the pending 1–4% range, so it won't break after 2026-06-30.

## Out of M3-A scope → future
- **M3-B:** County RSTPO classification (add a dated County cap to LEGAL → checker picks it up automatically). **M3-C:** deploy hardening. **M3-D:** CI. **Parallel:** legal-org sign-off of cap figures + ES wording ([[rentrights-gethelp-needs-legal-signoff]], [[rentrights-real-accurate-data]]).
