# RentRights M3-B — County RSTPO Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify unincorporated LA County addresses under the County RSTPO — `COUNTY_RSTPO` (2+ units AND CO ≤ 1995-02-01 → cap + just cause) or `COUNTY_JCO` (single-family/condo/post-1995 → just cause only) — using only DCBA-verified figures, with uncertain areas deferred to a DCBA pointer + caveats.

**Architecture:** Two new regimes; a `resolveCounty()` branch in the engine mirroring the City RSO pattern at a 1995 cutoff; `lookup` fetches Assessor parcels for unincorporated addresses too; the County standard cap lives in `LEGAL.countyCapPct` (verified); the increase checker and rights/i18n/components extend to the new regimes.

**Tech Stack:** Next.js 16, TS, Vitest (+RTL/jsdom), Playwright. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-m3b-county-rstpo-design.md`

**Data principle ([[rentrights-real-accurate-data]]):** County cap (1.93%) and the 1995 cutoff come ONLY from `LEGAL`; uncertain items (exemptions, relocation amounts, AB1482 layering, min-tenancy, post-2026-06 cap) are NOT encoded — DCBA pointer + caveat.

**Conventions:** alias `@/*` = repo root. Commit after every green step; after each task run `npx tsc --noEmit` + `npm test`. Branch `m3b-county-rstpo` (created).

**Verified current code (anchors):**
- `engine.ts`: unincorporated branch is the `!jurisdiction.inLACity` → `if (jurisdiction.placeName === null) return {regime:'OUT_OF_JURISDICTION', reasons:[{code:'UNINCORPORATED_COUNTY'}], ...}` block (lines ~22-37). Shared `useCodeKind`. City path uses `LEGAL.rsoBuildCutoffYear`.
- `types.ts`: `Regime` union; `ReasonCode` union + `ALL_REASON_CODES` array; the existing `UNINCORPORATED_COUNTY` reason code (catalog text already says "unincorporated LA County … (County RSTPO via DCBA)").
- `rights.ts`: `RIGHTS_POINTS: Record<Regime, number>`, `rightsText`, `capLabel` (RSO/AB1482/else), `capStaleness`, `stalenessMessage` (authority by regime).
- `increase.ts`: allowlist `RSO/AB1482/JCO_ONLY`; JCO_ONLY→NO_CAP; RSO and AB1482 branches.
- `IncreaseChecker.tsx`: OOJ/UNKNOWN→null; JCO_ONLY→no-cap note; else→form.
- `lookup.ts`: `if (jurisdiction.inLACity) { ...getParcel... }` (only city fetches parcels).
- `ResultCard.tsx`: cap block gated by `regime !== 'OUT_OF_JURISDICTION' && regime !== 'UNKNOWN'`; uses `rightsText`/`capLabel`/`capStaleness` — **regime-generic, needs no change**.
- `tests/i18n/coverage.test.ts`: hardcoded `REGIMES` array + iterates `ALL_REASON_CODES`.

---

## File Structure
- `messages/en.json`, `messages/es.json` — MODIFY: county rights/reason/cap/staleness keys
- `lib/rules/types.ts` — MODIFY: Regime + ReasonCode + ALL_REASON_CODES
- `lib/legal/constants.ts` — MODIFY: countyCapPct + countyBuildCutoffYear
- `lib/content/rights.ts` — MODIFY: RIGHTS_POINTS, capLabel, capStaleness, stalenessMessage
- `tests/i18n/coverage.test.ts` — MODIFY: REGIMES list
- `lib/rules/engine.ts` — MODIFY: county classification branch
- `lib/compute/lookup.ts` — MODIFY: fetch parcels for unincorporated too
- `lib/rules/increase.ts` — MODIFY: COUNTY_RSTPO/COUNTY_JCO
- `components/IncreaseChecker.tsx` — MODIFY: county gating
- `tests/rules/engine.test.ts`, `tests/compute/lookup.test.ts`, `tests/rules/increase.test.ts`, `tests/components/*` — MODIFY/CREATE
- `e2e/county.spec.ts` — CREATE

---

## Task 1: i18n catalog keys (county) — additive, green

**Files:** Modify `messages/en.json`, `messages/es.json`.

- [ ] **Step 1: Add the English keys**

Add to `messages/en.json` (comma-separate; no trailing comma at file end):
```json
  "rights.COUNTY_RSTPO.title": "LA County Rent Stabilization (RSTPO) (likely)",
  "rights.COUNTY_RSTPO.point1": "Your landlord generally needs a \"just cause\" to evict you.",
  "rights.COUNTY_RSTPO.point2": "Rent increases are capped (once every 12 months).",
  "rights.COUNTY_RSTPO.point3": "Small-property landlords and luxury units may have a higher cap — confirm with DCBA.",
  "rights.COUNTY_RSTPO.point4": "You may be owed relocation assistance for no-fault evictions. Confirm details with LA County DCBA.",
  "rights.COUNTY_JCO.title": "LA County Just Cause (unincorporated)",
  "rights.COUNTY_JCO.point1": "Your landlord generally needs a \"just cause\" to evict you, even without a rent cap.",
  "rights.COUNTY_JCO.point2": "This unit is likely not under the County rent cap.",
  "rights.COUNTY_JCO.point3": "California AB 1482 may still cap your rent — confirm below and with DCBA.",
  "rights.COUNTY_JCO.point4": "Confirm your exact protections with LA County DCBA.",
  "reason.COUNTY_BUILT_BEFORE_1995": "Built in {year} (before the County’s Feb 1, 1995 cutoff)",
  "reason.COUNTY_BUILT_AFTER_1995": "Built in {year} (after the County’s Feb 1, 1995 cutoff)",
  "reason.COUNTY_BUILT_1995_AMBIGUOUS": "Built in 1995 — the exact certificate-of-occupancy date (Feb 1 cutoff) determines County rent-cap coverage",
  "reason.COUNTY_BUILT_UNKNOWN": "Build date unknown — County rent-cap coverage depends on a certificate of occupancy on or before Feb 1, 1995",
  "result.capSeeDcba": "See LA County DCBA",
  "staleness.authority.dcba": "LA County DCBA"
```

- [ ] **Step 2: Add the Spanish keys**

Add to `messages/es.json`:
```json
  "rights.COUNTY_RSTPO.title": "Estabilización de Rentas del Condado de LA (RSTPO) (probable)",
  "rights.COUNTY_RSTPO.point1": "Por lo general, su arrendador necesita una \"causa justa\" para desalojarlo.",
  "rights.COUNTY_RSTPO.point2": "Los aumentos de renta tienen un tope (una vez cada 12 meses).",
  "rights.COUNTY_RSTPO.point3": "Los arrendadores de pocas propiedades y las unidades de lujo pueden tener un tope más alto — confirme con DCBA.",
  "rights.COUNTY_RSTPO.point4": "Podría corresponderle asistencia de reubicación en desalojos sin culpa. Confirme los detalles con el DCBA del Condado de LA.",
  "rights.COUNTY_JCO.title": "Causa Justa del Condado de LA (área no incorporada)",
  "rights.COUNTY_JCO.point1": "Por lo general, su arrendador necesita una \"causa justa\" para desalojarlo, incluso sin tope de renta.",
  "rights.COUNTY_JCO.point2": "Es probable que esta unidad no esté bajo el tope de renta del Condado.",
  "rights.COUNTY_JCO.point3": "La AB 1482 de California aún podría limitar su renta — verifique abajo y con el DCBA.",
  "rights.COUNTY_JCO.point4": "Confirme sus protecciones exactas con el DCBA del Condado de LA.",
  "reason.COUNTY_BUILT_BEFORE_1995": "Construido en {year} (antes del límite del Condado del 1 de feb. de 1995)",
  "reason.COUNTY_BUILT_AFTER_1995": "Construido en {year} (después del límite del Condado del 1 de feb. de 1995)",
  "reason.COUNTY_BUILT_1995_AMBIGUOUS": "Construido en 1995 — la fecha exacta del certificado de ocupación (límite del 1 de feb.) determina la cobertura del tope de renta del Condado",
  "reason.COUNTY_BUILT_UNKNOWN": "Fecha de construcción desconocida — la cobertura del tope del Condado depende de un certificado de ocupación del 1 de feb. de 1995 o anterior",
  "result.capSeeDcba": "Consulte el DCBA del Condado de LA",
  "staleness.authority.dcba": "el DCBA del Condado de LA"
```

- [ ] **Step 3: Verify parity (keys unused yet) + suite**

Run: `npx vitest run tests/i18n/catalog.test.ts` then `npm test` then `npx tsc --noEmit`
Expected: parity passes (en==es), full suite green, tsc clean. (Coverage test still uses old lists; new keys are simply present.)

- [ ] **Step 4: Commit**
```powershell
git add messages/en.json messages/es.json
git commit -m "feat(i18n): County RSTPO rights/reason/cap catalog keys (en/es)"
```

---

## Task 2: Types + constants + rights wiring + coverage list

**Files:** Modify `lib/rules/types.ts`, `lib/legal/constants.ts`, `lib/content/rights.ts`, `tests/i18n/coverage.test.ts`.

- [ ] **Step 1: Extend types**

In `lib/rules/types.ts`:
- Change `Regime` to: `export type Regime = 'RSO' | 'AB1482' | 'JCO_ONLY' | 'COUNTY_RSTPO' | 'COUNTY_JCO' | 'OUT_OF_JURISDICTION' | 'UNKNOWN';`
- Add to the `ReasonCode` union (before the closing `;`): `| 'COUNTY_BUILT_BEFORE_1995' | 'COUNTY_BUILT_AFTER_1995' | 'COUNTY_BUILT_1995_AMBIGUOUS' | 'COUNTY_BUILT_UNKNOWN'`
- Add those four to the `ALL_REASON_CODES` array (append before the closing `]`): `'COUNTY_BUILT_BEFORE_1995', 'COUNTY_BUILT_AFTER_1995', 'COUNTY_BUILT_1995_AMBIGUOUS', 'COUNTY_BUILT_UNKNOWN',`

- [ ] **Step 2: Add County constants**

In `lib/legal/constants.ts`, inside the `LEGAL` object (after the `ab1482CapPct` block, before `notice`):
```ts
  // LA County RSTPO (unincorporated areas), administered by DCBA.
  // Fully covered = 2+ units AND certificate of occupancy on or before Feb 1, 1995.
  countyBuildCutoffYear: 1995,
  countyBuildCutoffNote: 'CO on or before February 1, 1995',
  // County standard allowable annual increase (%): 60% of CPI, max 3% (small-landlord 4%, luxury 5%).
  countyCapPct: [
    { value: 1.93, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LA County DCBA RSTPO (60% of CPI, max 3%)', expectedUpdate: '2026-07-01' },
  ] as DatedValue<number>[],
```
(Also update the top comment to note County figures verified 2026-06-02 against DCBA.)

- [ ] **Step 3: Wire rights.ts for the new regimes**

In `lib/content/rights.ts`:
- `RIGHTS_POINTS`: add `COUNTY_RSTPO: 4, COUNTY_JCO: 4,` (the record is `Record<Regime, number>` so all regimes must be present — tsc enforces this).
- `capLabel`: add a County branch before the final `return t('result.capNone');`:
```ts
  if (regime === 'COUNTY_RSTPO') {
    const p = LEGAL.countyCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p ? t('result.capUpTo', { pct: p.value }) : t('result.capSeeDcba');
  }
```
- `capStaleness`: add before `return null;`:
```ts
  if (regime === 'COUNTY_RSTPO') return stalenessFor(LEGAL.countyCapPct, onDate);
```
- `stalenessMessage`: change the `who` line to include DCBA:
```ts
  const who =
    regime === 'AB1482' ? t('staleness.authority.state')
    : regime === 'COUNTY_RSTPO' ? t('staleness.authority.dcba')
    : t('staleness.authority.lahd');
```

- [ ] **Step 4: Update the coverage test's REGIMES list**

In `tests/i18n/coverage.test.ts`, change the `REGIMES` array to include the new regimes:
```ts
const REGIMES: Regime[] = ['RSO', 'AB1482', 'JCO_ONLY', 'COUNTY_RSTPO', 'COUNTY_JCO', 'OUT_OF_JURISDICTION', 'UNKNOWN'];
```

- [ ] **Step 5: Verify**

Run: `npm test` then `npx tsc --noEmit`
Expected: all green (coverage now checks the county rights/reason keys added in Task 1 — present; `RIGHTS_POINTS` complete; capLabel references `result.capSeeDcba` — present). tsc clean. (No county regime is emitted yet, so nothing else changes at runtime.)

- [ ] **Step 6: Commit**
```powershell
git add lib/rules/types.ts lib/legal/constants.ts lib/content/rights.ts tests/i18n/coverage.test.ts
git commit -m "feat(legal): County regimes/cap/cutoff types + constants + rights wiring"
```

---

## Task 3: Engine — County classification branch

**Files:** Modify `lib/rules/engine.ts`, `tests/rules/engine.test.ts`.

- [ ] **Step 1: Update the existing unincorporated test + add County tests**

In `tests/rules/engine.test.ts`, the current "unincorporated-county" test asserts `OUT_OF_JURISDICTION` + reason `UNINCORPORATED_COUNTY` for `{ inLACity:false, placeName:null }, facts:{ yearBuilt:1950, units:4, useCode:'0500' }`. Replace that test with County-classification tests:
```ts
  it('classifies a pre-1995 multi-unit unincorporated address as COUNTY_RSTPO', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false },
      facts: { yearBuilt: 1990, units: 4, useCode: '0500' },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
    expect(r.reasons.some((x) => x.code === 'UNINCORPORATED_COUNTY')).toBe(true);
    expect(r.reasons.some((x) => x.code === 'COUNTY_BUILT_BEFORE_1995')).toBe(true);
  });

  it('classifies a post-1995 multi-unit unincorporated address as COUNTY_JCO', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false },
      facts: { yearBuilt: 2010, units: 8, useCode: '0500' },
    });
    expect(r.regime).toBe('COUNTY_JCO');
  });

  it('classifies an unincorporated single-family home as COUNTY_JCO', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false },
      facts: { yearBuilt: 1990, units: 1, useCode: '0100' },
    });
    expect(r.regime).toBe('COUNTY_JCO');
  });

  it('lowers confidence at the 1995 County cutoff', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false },
      facts: { yearBuilt: 1995, units: 4, useCode: '0500' },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
    expect(r.confidence).toBe('medium');
  });
```
(Keep the existing WEHO/other-city test that asserts `OUT_OF_JURISDICTION` for a non-null placeName.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: FAIL — engine still returns OUT_OF_JURISDICTION for the unincorporated case.

- [ ] **Step 3: Implement the County branch**

In `lib/rules/engine.ts`, replace the unincorporated return block. Change:
```ts
  if (!jurisdiction.inLACity) {
    if (jurisdiction.placeName === null) {
      return {
        regime: 'OUT_OF_JURISDICTION',
        confidence: 'high',
        reasons: [{ code: 'UNINCORPORATED_COUNTY' }],
        questions: [],
      };
    }
    return {
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: jurisdiction.placeName } }],
      questions: [],
    };
  }
```
to:
```ts
  if (!jurisdiction.inLACity) {
    if (jurisdiction.placeName !== null) {
      return {
        regime: 'OUT_OF_JURISDICTION',
        confidence: 'high',
        reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: jurisdiction.placeName } }],
        questions: [],
      };
    }
    return resolveCounty(facts, answers);
  }
```
Then add this helper at the end of the file (after `resolveRegime`):
```ts
// Unincorporated LA County → County RSTPO. Fully covered (cap + just cause) requires
// 2+ units AND certificate of occupancy on or before Feb 1, 1995 (approximated by year built).
function resolveCounty(facts: ParcelFacts, answers: UserAnswers): RegimeResult {
  const reasons: ReasonItem[] = [{ code: 'UNINCORPORATED_COUNTY' }];
  const questions: QuestionId[] = [];

  let builtBeforeCounty: boolean | null;
  if (facts.yearBuilt == null) {
    builtBeforeCounty = null;
    reasons.push({ code: 'COUNTY_BUILT_UNKNOWN' });
  } else if (facts.yearBuilt < LEGAL.countyBuildCutoffYear) {
    builtBeforeCounty = true;
    reasons.push({ code: 'COUNTY_BUILT_BEFORE_1995', params: { year: facts.yearBuilt } });
  } else if (facts.yearBuilt > LEGAL.countyBuildCutoffYear) {
    builtBeforeCounty = false;
    reasons.push({ code: 'COUNTY_BUILT_AFTER_1995', params: { year: facts.yearBuilt } });
  } else {
    builtBeforeCounty = null;
    reasons.push({ code: 'COUNTY_BUILT_1995_AMBIGUOUS' });
  }

  // Unit count / single-family — reuse the same neutral reason codes & questions as the city path.
  let multiUnit: boolean | null;
  if (answers.isCondo === true) {
    multiUnit = false;
    reasons.push({ code: 'SAID_CONDO' });
  } else if (answers.isSeparateHouse === true) {
    multiUnit = false;
    reasons.push({ code: 'SAID_SEPARATE_HOUSE' });
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
    multiUnit = true;
    reasons.push({ code: 'UNITS_COUNT', params: { count: facts.units } });
  } else if (facts.units === 2) {
    multiUnit = true;
    reasons.push({ code: 'TWO_UNITS' });
    if (answers.isSeparateHouse === undefined) questions.push('IS_SEPARATE_HOUSE');
  } else {
    multiUnit = false;
    reasons.push({ code: 'SINGLE_UNIT' });
  }
  if (multiUnit === true && answers.isCondo === undefined && useCodeKind(facts.useCode) !== 'apartment') {
    questions.push('IS_CONDO');
  }

  const conf: Confidence = questions.length === 0 ? 'high' : 'medium';

  if (multiUnit === true) {
    if (builtBeforeCounty === true) return { regime: 'COUNTY_RSTPO', confidence: conf, reasons, questions };
    if (builtBeforeCounty === false) return { regime: 'COUNTY_JCO', confidence: conf, reasons, questions };
    // Build date unknown/ambiguous but multi-unit → lean fully covered, lower confidence.
    return { regime: 'COUNTY_RSTPO', confidence: 'medium', reasons, questions };
  }
  if (multiUnit === false) {
    // Single-family / condo → partially covered: just cause only (no County rent cap).
    return { regime: 'COUNTY_JCO', confidence: conf, reasons, questions };
  }
  // Unit count unknown → just cause applies to both tiers, so COUNTY_JCO is the safe floor; ask to refine.
  return { regime: 'COUNTY_JCO', confidence: 'low', reasons, questions };
}
```
(`Confidence`, `ParcelFacts`, `UserAnswers`, `ReasonItem`, `QuestionId`, `RegimeResult` are already imported at the top of engine.ts.)

- [ ] **Step 4: Run engine tests + full suite + tsc**

Run: `npx vitest run tests/rules/engine.test.ts` then `npm test` then `npx tsc --noEmit`
Expected: all green (existing city tests unchanged; new county tests pass).

- [ ] **Step 5: Commit**
```powershell
git add lib/rules/engine.ts tests/rules/engine.test.ts
git commit -m "feat(rules): County RSTPO classification for unincorporated addresses"
```

---

## Task 4: lookup parcels for unincorporated + increase checker County caps

**Files:** Modify `lib/compute/lookup.ts`, `lib/rules/increase.ts`, `tests/compute/lookup.test.ts`, `tests/rules/increase.test.ts`.

- [ ] **Step 1: Add the lookup test for unincorporated parcel fetch**

In `tests/compute/lookup.test.ts`, add a test that an unincorporated address (placeName null) still fetches the parcel and classifies via County. Use the existing `deps(j, facts)` helper pattern:
```ts
  it('fetches parcel facts for an unincorporated County address', async () => {
    const res = await lookup('x', {}, deps(
      { inLACity: false, placeName: null, incorporated: false },
      { yearBuilt: 1990, units: 4, useCode: '0500' },
    ));
    expect(res.facts.units).toBe(4);
    expect(res.result.regime).toBe('COUNTY_RSTPO');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/compute/lookup.test.ts`
Expected: FAIL — lookup only fetches parcels for in-city addresses, so `facts.units` is null and the regime isn't COUNTY_RSTPO.

- [ ] **Step 3: Fetch parcels for unincorporated in `lib/compute/lookup.ts`**

Change the guard:
```ts
  if (jurisdiction.inLACity) {
```
to:
```ts
  if (jurisdiction.inLACity || jurisdiction.placeName === null) {
```
(The Assessor covers all of LA County, so parcel facts are available for unincorporated areas too. The `dataWarnings` fallback inside the block is unchanged.)

- [ ] **Step 4: Add increase-checker County tests**

In `tests/rules/increase.test.ts`, add (NOW is already `new Date('2026-06-02')`):
```ts
  it('COUNTY_RSTPO 1.93%: within and over', () => {
    expect(checkIncrease({ regime: 'COUNTY_RSTPO', currentRent: 2000, proposedRent: 2030, onDate: NOW }).verdict).toBe('WITHIN_CAP');
    const over = checkIncrease({ regime: 'COUNTY_RSTPO', currentRent: 2000, proposedRent: 2100, onDate: NOW });
    expect(over.verdict).toBe('OVER_CAP');
    expect(over.capPct).toBe(1.93);
  });

  it('COUNTY_JCO: no cap', () => {
    expect(checkIncrease({ regime: 'COUNTY_JCO', currentRent: 2000, proposedRent: 9999, onDate: NOW }).verdict).toBe('NO_CAP');
  });
```
(2000 × 1.0193 = 2038.6 → 2030 within, 2100 over.)

- [ ] **Step 5: Run to verify it fails**

Run: `npx vitest run tests/rules/increase.test.ts`
Expected: FAIL — COUNTY_RSTPO/COUNTY_JCO currently fall to NOT_APPLICABLE.

- [ ] **Step 6: Implement County in `lib/rules/increase.ts`**

- Change the allowlist guard:
```ts
  if (regime !== 'RSO' && regime !== 'AB1482' && regime !== 'JCO_ONLY') {
    return { verdict: 'NOT_APPLICABLE' };
  }
  if (regime === 'JCO_ONLY') return { verdict: 'NO_CAP' };
```
to:
```ts
  if (regime !== 'RSO' && regime !== 'AB1482' && regime !== 'JCO_ONLY' && regime !== 'COUNTY_RSTPO' && regime !== 'COUNTY_JCO') {
    return { verdict: 'NOT_APPLICABLE' };
  }
  if (regime === 'JCO_ONLY' || regime === 'COUNTY_JCO') return { verdict: 'NO_CAP' };
```
- Add a COUNTY_RSTPO branch. After the AB1482 block (the file ends with the AB1482 `return`), insert a COUNTY_RSTPO branch BEFORE the AB1482 block — or, simplest, add it right after the RSO `if (regime === 'RSO') { ... }` block:
```ts
  if (regime === 'COUNTY_RSTPO') {
    const period = LEGAL.countyCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!period) return { verdict: 'NOT_APPLICABLE' };
    const capPct = period.value;
    const allowedMaxRent = round2(currentRent * (1 + capPct / 100));
    return {
      verdict: proposedRent <= allowedMaxRent ? 'WITHIN_CAP' : 'OVER_CAP',
      capPct,
      allowedMaxRent,
      proposedPct,
    };
  }
```
(The final block remains the AB1482 path. Order: RSO → COUNTY_RSTPO → AB1482-fallthrough. Ensure the AB1482 code is only reached for `regime === 'AB1482'` — it already is the last regime in the allowlist.)

- [ ] **Step 7: Run both tests + full suite + tsc**

Run: `npx vitest run tests/compute/lookup.test.ts tests/rules/increase.test.ts` then `npm test` then `npx tsc --noEmit`
Expected: all green.

- [ ] **Step 8: Commit**
```powershell
git add lib/compute/lookup.ts lib/rules/increase.ts tests/compute/lookup.test.ts tests/rules/increase.test.ts
git commit -m "feat(rules): unincorporated parcel lookup + County RSTPO increase caps"
```

---

## Task 5: IncreaseChecker County gating + component tests

**Files:** Modify `components/IncreaseChecker.tsx`; Create `tests/components/county.test.tsx`.

- [ ] **Step 1: Gate the checker for County regimes**

In `components/IncreaseChecker.tsx`, change the JCO_ONLY no-cap branch to also cover COUNTY_JCO:
```ts
  if (regime === 'JCO_ONLY') {
```
to:
```ts
  if (regime === 'JCO_ONLY' || regime === 'COUNTY_JCO') {
```
(OOJ/UNKNOWN still return null; RSO/AB1482/COUNTY_RSTPO fall through to the form, and `checkIncrease` now handles COUNTY_RSTPO.)

- [ ] **Step 2: Write component tests for the County regimes**

Create `tests/components/county.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { IncreaseChecker } from '@/components/IncreaseChecker';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { RegimeResult } from '@/lib/rules/types';

afterEach(cleanup);

const countyRsto: RegimeResult = {
  regime: 'COUNTY_RSTPO',
  confidence: 'high',
  reasons: [{ code: 'UNINCORPORATED_COUNTY' }, { code: 'COUNTY_BUILT_BEFORE_1995', params: { year: 1990 } }, { code: 'UNITS_COUNT', params: { count: 4 } }],
  questions: [],
};

describe('County regimes in the UI', () => {
  it('ResultCard renders the County RSTPO title and cap', () => {
    render(<LocaleProvider initialLocale="en"><ResultCard result={countyRsto} /></LocaleProvider>);
    expect(screen.getByText(/LA County Rent Stabilization/)).toBeTruthy();
    expect(screen.getByText(/Built in 1990/)).toBeTruthy();
  });

  it('IncreaseChecker flags an over-cap increase for COUNTY_RSTPO', () => {
    render(<LocaleProvider initialLocale="en"><IncreaseChecker regime="COUNTY_RSTPO" /></LocaleProvider>);
    fireEvent.change(screen.getByLabelText('Current monthly rent'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Proposed new rent'), { target: { value: '2200' } });
    expect(screen.getByText(/Over the legal cap/i)).toBeTruthy();
  });

  it('IncreaseChecker shows a no-cap note for COUNTY_JCO', () => {
    render(<LocaleProvider initialLocale="en"><IncreaseChecker regime="COUNTY_JCO" /></LocaleProvider>);
    expect(screen.getByText(/no maximum increase amount/i)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run + full suite + tsc**

Run: `npx vitest run tests/components/county.test.tsx` then `npm test` then `npx tsc --noEmit`
Expected: 3 passed; full suite green; tsc clean.

- [ ] **Step 4: Commit**
```powershell
git add components/IncreaseChecker.tsx tests/components/county.test.tsx
git commit -m "feat(ui): County regime gating in IncreaseChecker + component tests"
```

---

## Task 6: E2E + full verification + finish

**Files:** Create `e2e/county.spec.ts`.

- [ ] **Step 1: Create the County E2E (live, real unincorporated address)**

Create `e2e/county.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('classifies a real unincorporated County address under County RSTPO', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1000 N Eastern Ave, East Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  // East LA is unincorporated → County classification + DCBA in get-help. Date-stable text only.
  await expect(page.getByText(/unincorporated LA County/i).first()).toBeVisible();
  await expect(page.getByText(/DCBA/).first()).toBeVisible();
});
```

- [ ] **Step 2: Verify discovery + offline suite + build**

Run: `npx playwright test --list` (expect 8 tests: 7 prior + this) then `npm test` then `npx tsc --noEmit` then `npm run build`
Expected: 8 listed; offline green; tsc clean; build OK.

- [ ] **Step 3: Run the live E2E suite**

Free port 3000 if needed (`Get-NetTCPConnection -LocalPort 3000 | Stop-Process` the PID; production server via `next build && next start`, NOT `next dev`). Run: `npm run e2e`
Expected: all 8 pass against live APIs (the County test asserts the date-stable "unincorporated LA County" + DCBA). Transient API timeouts retry; genuine assertion failures stop and report.

- [ ] **Step 4: Smoke Claude-in-Chrome check (memory rentrights-full-site-chrome-qa)**

Production server (`npm run build && npx next start -p 3000`), fresh tab, in English: enter `1000 N Eastern Ave, East Los Angeles, CA` → confirm a **County** result renders ("LA County Rent Stabilization" or "LA County Just Cause" title, an "unincorporated LA County" reason, DCBA first under get-help). If it classifies as COUNTY_RSTPO, enter current `2000` / proposed `2200` in the increase checker → "over the legal cap". Screenshot. (Use element refs.)

- [ ] **Step 5: Complete the development branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §3.1 constants → Task 2. §3.2 types → Task 2. §3.3 engine County branch (1995 cutoff, regimes, reuse unit logic, confidence) → Task 3. §3.4 lookup unincorporated fetch → Task 4. §3.5 increase County caps → Task 4. §3.6 rights/capLabel/capStaleness + IncreaseChecker gating (ResultCard needs no change — regime-generic) → Tasks 2, 5. §3.7 i18n → Task 1. §6 tests → Tasks 3-6 (engine/lookup/increase/component/E2E); real-data E2E + Chrome smoke → Task 6. UNCERTAIN items not encoded (no exemption/relocation/AB1482/min-tenancy logic) — only DCBA pointer via the rights points + existing get-help DCBA-first. County cap only from `LEGAL.countyCapPct`.
- **Placeholder scan:** No TBD. All code/JSON complete. Test expectations (1.93% → 2038.6; pre/post-1995 classification) derived from the verified DCBA figures, not invented. Reuses the existing `UNINCORPORATED_COUNTY` reason (its catalog text already says "unincorporated LA County … County RSTPO via DCBA") so the existing unincorporated E2E text match keeps working.
- **Type consistency:** `Regime` gains `COUNTY_RSTPO`/`COUNTY_JCO` (Task 2) consumed by `RIGHTS_POINTS` (must list all — enforced), `capLabel`/`capStaleness`/`stalenessMessage`, `checkIncrease` allowlist (Task 4), `IncreaseChecker` (Task 5), engine (Task 3). New `ReasonCode`s added to the union AND `ALL_REASON_CODES` (so the coverage test requires their catalog keys — added Task 1). `REGIMES` in the coverage test updated (Task 2) to require county rights keys (added Task 1). `LEGAL.countyCapPct` typed `DatedValue<number>[]`, consumed identically to `ab1482CapPct`.
- **Green-at-every-commit:** Task 1 keys are additive (unused). Task 2 adds the regime+content+coverage together so the Record/coverage stay satisfied (keys already present). Task 3 emits regimes that Tasks 1-2 already made renderable. Tasks 4-5 complete the checker. Each task ends with `tsc` + `npm test`.

## Out of M3-B scope → future
- **M3-C:** deploy hardening (Docker + NPM proxy). **M3-D:** CI. **Future:** other incorporated cities; small-landlord/luxury cap variants; encoding UNCERTAIN items after legal review.
- **Parallel:** County cap/cutoff + ES wording legal-org sign-off ([[rentrights-gethelp-needs-legal-signoff]], [[rentrights-real-accurate-data]]).
