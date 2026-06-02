# RentRights M2-A — Trust & Accuracy Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three trust/accuracy features on top of the M1 estimator — AB 1482 15-year new-construction exemption (auto-computed), a condo confirming-question, unincorporated-LA-County guidance, per-figure staleness markers, and a get-help organization directory.

**Architecture:** Extend the existing pure rules engine (`lib/rules/engine.ts`), the dated-constants layer (`lib/legal/*`), and the content/UI layers. Engine gains a `now` input for the date-based 15-year cutoff; staleness is a new pure helper over dated constants; get-help is static, web-verified data rendered by a server component. No new external API calls.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Vitest. EN-only (i18n is M2-B). Vitest unit/integration only (Playwright E2E is M2-D).

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-m2a-trust-accuracy-pack-design.md`

**Conventions:** Import alias `@/*` = repo root. Tests colocated under `tests/`. Pure functions unit-tested with injected dates (no `new Date()` reliance in tests). Commit after every green step. Branch: `m2a-trust-accuracy-pack` (already created).

---

## File Structure

- `lib/rules/engine.ts` — MODIFY: add `now` to `ResolveInput`; 15-yr exemption; unincorporated-county branch; `useCodeKind` helper + condo question/routing
- `lib/rules/types.ts` — MODIFY: add `IS_CONDO` to `QuestionId`, `isCondo` to `UserAnswers`
- `lib/legal/select.ts` — MODIFY: add `expectedUpdate?` to `DatedValue`
- `lib/legal/constants.ts` — MODIFY: add `expectedUpdate` values to RSO & AB1482 periods
- `lib/legal/staleness.ts` — CREATE: pure `stalenessFor()` helper
- `lib/content/rights.ts` — MODIFY: add `capStaleness()` + `stalenessMessage()`
- `lib/content/help.ts` — CREATE: `HelpOrg` type, `HELP_ORGS` (web-verified), `orgsFor()`
- `components/GetHelp.tsx` — CREATE: directory render
- `components/ResultCard.tsx` — MODIFY: inline staleness marker
- `components/ConfirmingQuestions.tsx` — MODIFY: `IS_CONDO` question text
- `app/page.tsx` — MODIFY: render `<GetHelp>` + pass unincorporated flag
- `tests/rules/engine.test.ts` — MODIFY: new cases + make existing AB1482 test deterministic
- `tests/legal/staleness.test.ts` — CREATE
- `tests/content/rights.test.ts` — CREATE (capStaleness)
- `tests/content/help.test.ts` — CREATE

---

## Task 1: Engine — AB 1482 15-year new-construction exemption (auto-compute)

**Files:**
- Modify: `lib/rules/engine.ts` (add `now` to `ResolveInput` at lines 4-8; signature line 10; decision block lines 67-78)
- Test: `tests/rules/engine.test.ts` (add cases; make the existing post-1978 test deterministic)

- [ ] **Step 1: Add the failing tests**

At the top of `tests/rules/engine.test.ts`, below the existing `const WEHO = ...` line, add a fixed clock:
```ts
const NOW = new Date('2026-06-02'); // cutoffYear = 2011
```

Update the existing post-1978 test so it no longer depends on the real wall-clock. Replace:
```ts
  it('classifies a post-1978 multi-unit building as AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2010, units: 8, useCode: '0500' } });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('high');
  });
```
with:
```ts
  it('classifies a post-1978 multi-unit building as AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2010, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('high');
  });
```

Then add these new tests inside the `describe('resolveRegime', ...)` block:
```ts
  it('treats a multi-unit building built within the last 15 years as AB1482-exempt (JCO_ONLY)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2020, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.reasons.some((x) => x.includes('within the last 15 years'))).toBe(true);
  });

  it('keeps a building older than 15 years on AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1995, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('AB1482');
  });

  it('lowers confidence to medium near the 15-year cutoff', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2011, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.confidence).toBe('medium');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: FAIL — the new "within the last 15 years" cases return `AB1482`/wrong confidence (the `now` property is accepted by TS only after Step 3, so the run fails to compile or the assertions fail).

- [ ] **Step 3: Implement `now` + the exemption**

In `lib/rules/engine.ts`, change the `ResolveInput` interface (lines 4-8) to:
```ts
export interface ResolveInput {
  jurisdiction: Jurisdiction;
  facts: ParcelFacts;
  answers?: UserAnswers;
  now?: Date;
}
```

Change the function signature (line 10) to:
```ts
export function resolveRegime({ jurisdiction, facts, answers = {}, now = new Date() }: ResolveInput): RegimeResult {
```

In the decision block, replace the `builtBefore === false` branch (currently lines 71-74):
```ts
    if (builtBefore === false) {
      reasons.push('Built after the RSO cutoff with multiple units → AB 1482 applies');
      return { regime: 'AB1482', confidence: conf(), reasons, questions };
    }
```
with:
```ts
    if (builtBefore === false) {
      const cutoffYear = now.getFullYear() - 15;
      if (facts.yearBuilt != null && facts.yearBuilt >= cutoffYear) {
        const nearCutoff = facts.yearBuilt === cutoffYear || facts.yearBuilt === cutoffYear + 1;
        reasons.push(
          `Built in ${facts.yearBuilt} — within the last 15 years, so likely exempt from AB 1482's rent cap (new construction). Citywide Just Cause still applies.`,
        );
        if (nearCutoff) {
          reasons.push('This is near the 15-year cutoff — the exact certificate-of-occupancy date may affect this.');
        }
        return { regime: 'JCO_ONLY', confidence: nearCutoff ? 'medium' : conf(), reasons, questions };
      }
      reasons.push('Built after the RSO cutoff with multiple units → AB 1482 applies');
      return { regime: 'AB1482', confidence: conf(), reasons, questions };
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: PASS (existing cases + 3 new cases).

- [ ] **Step 5: Commit**
```powershell
git add lib/rules/engine.ts tests/rules/engine.test.ts
git commit -m "feat(rules): auto-compute AB1482 15-year new-construction exemption"
```

---

## Task 2: Engine — unincorporated LA County guidance

**Files:**
- Modify: `lib/rules/engine.ts` (out-of-jurisdiction guard, lines 11-19)
- Test: `tests/rules/engine.test.ts`

- [ ] **Step 1: Add the failing test**

Add inside `describe('resolveRegime', ...)`:
```ts
  it('gives an unincorporated-county message when Census returns no incorporated place', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false },
      facts: { yearBuilt: 1950, units: 4, useCode: '0500' },
    });
    expect(r.regime).toBe('OUT_OF_JURISDICTION');
    expect(r.confidence).toBe('high');
    expect(r.reasons.some((x) => x.toLowerCase().includes('unincorporated'))).toBe(true);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/rules/engine.test.ts -t unincorporated`
Expected: FAIL — reason text is the generic "outside the City of Los Angeles".

- [ ] **Step 3: Implement the branch**

In `lib/rules/engine.ts`, replace the out-of-jurisdiction guard (lines 11-19):
```ts
  if (!jurisdiction.inLACity) {
    const where = jurisdiction.placeName ?? 'This address';
    return {
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [`${where} is outside the City of Los Angeles`],
      questions: [],
    };
  }
```
with:
```ts
  if (!jurisdiction.inLACity) {
    if (jurisdiction.placeName === null) {
      return {
        regime: 'OUT_OF_JURISDICTION',
        confidence: 'high',
        reasons: [
          'This address may be in unincorporated LA County, which has its own rules (County RSTPO via DCBA) rather than the City of Los Angeles.',
        ],
        questions: [],
      };
    }
    return {
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [`${jurisdiction.placeName} is outside the City of Los Angeles`],
      questions: [],
    };
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: PASS (existing WEHO test still passes — its `placeName` is non-null).

- [ ] **Step 5: Commit**
```powershell
git add lib/rules/engine.ts tests/rules/engine.test.ts
git commit -m "feat(rules): unincorporated LA County guidance message"
```

---

## Task 3: Engine — condo confirming question + `useCodeKind`

**Files:**
- Modify: `lib/rules/types.ts` (add `IS_CONDO` to `QuestionId`; `isCondo` to `UserAnswers`)
- Modify: `lib/rules/engine.ts` (add `useCodeKind`; restructure unit block; condo-question trigger)
- Test: `tests/rules/engine.test.ts`

- [ ] **Step 1: Add the failing tests**

Add inside `describe('resolveRegime', ...)`:
```ts
  it('asks the condo question for a multi-unit building whose use code is not clearly an apartment', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1990, units: 4, useCode: '0200' }, now: NOW });
    expect(r.questions).toContain('IS_CONDO');
  });

  it('does not ask the condo question for a clear apartment building (use code 05xx)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1931, units: 6, useCode: '0500' } });
    expect(r.questions).not.toContain('IS_CONDO');
  });

  it('routes a confirmed condo to the single-family/condo path', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 1990, units: 4, useCode: '0200' },
      answers: { isCondo: true },
      now: NOW,
    });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.questions).toContain('AB1482_EXEMPTION_NOTICE');
    expect(r.questions).not.toContain('IS_CONDO');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: FAIL — `IS_CONDO`/`isCondo` are not valid types yet, and the condo trigger/routing do not exist.

- [ ] **Step 3: Add the types**

In `lib/rules/types.ts`, replace the `QuestionId` block (lines 4-8):
```ts
// M1 confirming questions (condo-conversion & 15-yr-exemption nuances are M2).
export type QuestionId =
  | 'BUILT_BEFORE_OCT_1978'
  | 'IS_SEPARATE_HOUSE'
  | 'AB1482_EXEMPTION_NOTICE';
```
with:
```ts
export type QuestionId =
  | 'BUILT_BEFORE_OCT_1978'
  | 'IS_SEPARATE_HOUSE'
  | 'AB1482_EXEMPTION_NOTICE'
  | 'IS_CONDO';
```

In the same file, replace the `UserAnswers` interface (lines 22-26):
```ts
export interface UserAnswers {
  builtBeforeOct1978?: boolean;
  isSeparateHouse?: boolean; // true => the 2nd unit is an ADU/guest house (treat as single-family)
  hasAb1482ExemptionNotice?: boolean;
}
```
with:
```ts
export interface UserAnswers {
  builtBeforeOct1978?: boolean;
  isSeparateHouse?: boolean; // true => the 2nd unit is an ADU/guest house (treat as single-family)
  hasAb1482ExemptionNotice?: boolean;
  isCondo?: boolean; // true => individually-owned condo (treat like single-family for rent-cap rules)
}
```

- [ ] **Step 4: Add `useCodeKind` and the condo logic**

In `lib/rules/engine.ts`, add this exported helper just above `export function resolveRegime` (after the `ResolveInput` interface):
```ts
// Classify an LA County Assessor use code. Verify/extend the code sets against the
// official LA County use-code reference when adding condo-specific codes.
//   01xx = single-family residence, 05xx = 5+ unit apartment building.
export function useCodeKind(useCode: string | null): 'apartment' | 'sfr' | 'condo' | 'ambiguous' {
  if (!useCode) return 'ambiguous';
  if (useCode.startsWith('05')) return 'apartment';
  if (useCode.startsWith('01')) return 'sfr';
  return 'ambiguous';
}
```

Replace the entire "Unit count / single-family" block (currently lines 44-62):
```ts
  // --- Unit count / single-family ---
  let multiUnit: boolean | null;
  if (answers.isSeparateHouse === true) {
    multiUnit = false;
    reasons.push('You said the other unit is a separate house (treated as single-family)');
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
    multiUnit = true;
    reasons.push(`${facts.units} units on the parcel`);
  } else if (facts.units === 2) {
    multiUnit = true;
    reasons.push('2 units on the parcel');
    if (answers.isSeparateHouse === undefined) questions.push('IS_SEPARATE_HOUSE');
  } else {
    multiUnit = false;
    reasons.push('Single unit on the parcel (single-family)');
  }
```
with:
```ts
  // --- Unit count / single-family (an explicit answer overrides parcel data) ---
  let multiUnit: boolean | null;
  if (answers.isCondo === true) {
    multiUnit = false;
    reasons.push('You said this is an individually-owned condo (treated like a single-family home for rent-cap rules)');
  } else if (answers.isSeparateHouse === true) {
    multiUnit = false;
    reasons.push('You said the other unit is a separate house (treated as single-family)');
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
    multiUnit = true;
    reasons.push(`${facts.units} units on the parcel`);
  } else if (facts.units === 2) {
    multiUnit = true;
    reasons.push('2 units on the parcel');
    if (answers.isSeparateHouse === undefined) questions.push('IS_SEPARATE_HOUSE');
  } else {
    multiUnit = false;
    reasons.push('Single unit on the parcel (single-family)');
  }

  // Condo confirming question: multi-unit on paper, but the use code does not clearly
  // say "apartment" — it could be individually-owned condos (AB 1482 treats those like SFRs).
  if (multiUnit === true && answers.isCondo === undefined && useCodeKind(facts.useCode) !== 'apartment') {
    questions.push('IS_CONDO');
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: PASS — all engine tests (M1 + Tasks 1-3) green.

- [ ] **Step 6: Commit**
```powershell
git add lib/rules/types.ts lib/rules/engine.ts tests/rules/engine.test.ts
git commit -m "feat(rules): condo confirming question + use-code classifier"
```

---

## Task 4: Staleness — dated `expectedUpdate` + pure `stalenessFor`

**Files:**
- Modify: `lib/legal/select.ts` (add `expectedUpdate?` to `DatedValue`)
- Modify: `lib/legal/constants.ts` (add `expectedUpdate` to RSO & AB1482 periods)
- Create: `lib/legal/staleness.ts`
- Test: `tests/legal/staleness.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/legal/staleness.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { stalenessFor } from '@/lib/legal/staleness';
import { DatedValue } from '@/lib/legal/select';

const items: DatedValue<number | null>[] = [
  { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD', expectedUpdate: '2026-07-01' },
  { value: null, effectiveFrom: '2026-07-01', source: 'LAHD', expectedUpdate: '2026-07-01' },
];

describe('stalenessFor', () => {
  it('is not stale inside an active period before its expected update', () => {
    expect(stalenessFor(items, new Date('2026-06-02')).stale).toBe(false);
  });

  it('flags a pending (null-value) period', () => {
    const s = stalenessFor(items, new Date('2026-08-01'));
    expect(s.stale).toBe(true);
    expect(s.reason).toBe('pending publication');
    expect(s.expectedUpdate).toBe('2026-07-01');
  });

  it('flags past-expected-update when the value is concrete but overdue', () => {
    const overdue: DatedValue<number>[] = [
      { value: 8, effectiveFrom: '2025-08-01', effectiveTo: '2026-12-31', source: 'x', expectedUpdate: '2026-08-01' },
    ];
    const s = stalenessFor(overdue, new Date('2026-09-01'));
    expect(s.stale).toBe(true);
    expect(s.reason).toBe('past expected update');
  });

  it('flags no-current-value when no period covers the date', () => {
    const s = stalenessFor(items, new Date('2020-01-01'));
    expect(s.stale).toBe(true);
    expect(s.reason).toBe('no current value');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/legal/staleness.test.ts`
Expected: FAIL — cannot find module `@/lib/legal/staleness`.

- [ ] **Step 3: Add `expectedUpdate` to `DatedValue`**

In `lib/legal/select.ts`, replace the `DatedValue` interface (lines 1-7):
```ts
export interface DatedValue<T> {
  value: T;
  effectiveFrom: string; // 'YYYY-MM-DD'
  effectiveTo?: string; // inclusive
  source: string;
  note?: string;
}
```
with:
```ts
export interface DatedValue<T> {
  value: T;
  effectiveFrom: string; // 'YYYY-MM-DD'
  effectiveTo?: string; // inclusive
  source: string;
  note?: string;
  expectedUpdate?: string; // 'YYYY-MM-DD' — when a fresh figure is expected to be published
}
```

- [ ] **Step 4: Implement `stalenessFor`**

Create `lib/legal/staleness.ts`:
```ts
import { DatedValue, selectDated } from './select';

export interface Staleness {
  stale: boolean;
  expectedUpdate?: string;
  reason?: 'pending publication' | 'past expected update' | 'no current value';
}

export function stalenessFor<T>(items: DatedValue<T>[], onDate: Date): Staleness {
  const p = selectDated(items, onDate);
  if (!p) return { stale: true, reason: 'no current value' };
  if (p.value == null) return { stale: true, expectedUpdate: p.expectedUpdate, reason: 'pending publication' };
  const d = onDate.toISOString().slice(0, 10);
  if (p.expectedUpdate && d > p.expectedUpdate) {
    return { stale: true, expectedUpdate: p.expectedUpdate, reason: 'past expected update' };
  }
  return { stale: false };
}
```

- [ ] **Step 5: Run staleness test to verify it passes**

Run: `npx vitest run tests/legal/staleness.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 6: Add `expectedUpdate` to the real constants**

In `lib/legal/constants.ts`, replace the `rsoCapPct` array (lines 18-28):
```ts
  rsoCapPct: [
    { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD' },
    {
      value: null,
      floorPct: 1,
      ceilingPct: 4,
      effectiveFrom: '2026-07-01',
      source: 'LAHD',
      note: 'New formula: 90% of CPI, floor 1% / ceiling 4%. LAHD publishes the exact % ~July 1.',
    },
  ] as RsoCapPeriod[],
```
with:
```ts
  rsoCapPct: [
    { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD', expectedUpdate: '2026-07-01' },
    {
      value: null,
      floorPct: 1,
      ceilingPct: 4,
      effectiveFrom: '2026-07-01',
      source: 'LAHD',
      expectedUpdate: '2026-07-01',
      note: 'New formula: 90% of CPI, floor 1% / ceiling 4%. LAHD publishes the exact % ~July 1.',
    },
  ] as RsoCapPeriod[],
```

In the same file, replace the `ab1482CapPct` array (lines 31-34):
```ts
  ab1482CapPct: [
    { value: 8.0, effectiveFrom: '2025-08-01', effectiveTo: '2026-07-31', source: 'CA Civ §1947.12 / CPI' },
    { value: 8.7, effectiveFrom: '2026-08-01', effectiveTo: '2027-07-31', source: 'CA Civ §1947.12 / CPI' },
  ] as DatedValue<number>[],
```
with:
```ts
  ab1482CapPct: [
    { value: 8.0, effectiveFrom: '2025-08-01', effectiveTo: '2026-07-31', source: 'CA Civ §1947.12 / CPI', expectedUpdate: '2026-08-01' },
    { value: 8.7, effectiveFrom: '2026-08-01', effectiveTo: '2027-07-31', source: 'CA Civ §1947.12 / CPI', expectedUpdate: '2027-08-01' },
  ] as DatedValue<number>[],
```

- [ ] **Step 7: Run the full suite (regression)**

Run: `npm test`
Expected: all green (M1 + new staleness suite). Confirms the constants edits did not break legal/select tests.

- [ ] **Step 8: Commit**
```powershell
git add lib/legal/select.ts lib/legal/staleness.ts lib/legal/constants.ts tests/legal/staleness.test.ts
git commit -m "feat(legal): per-figure staleness helper + expectedUpdate constants"
```

---

## Task 5: Content — `capStaleness` + `stalenessMessage`

**Files:**
- Modify: `lib/content/rights.ts` (add two helpers)
- Test: `tests/content/rights.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/content/rights.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { capStaleness, stalenessMessage } from '@/lib/content/rights';

describe('capStaleness', () => {
  it('returns null for regimes without a rent cap', () => {
    expect(capStaleness('JCO_ONLY', new Date('2026-06-02'))).toBeNull();
    expect(capStaleness('OUT_OF_JURISDICTION', new Date('2026-06-02'))).toBeNull();
  });

  it('is not stale for RSO on 2026-06-02', () => {
    expect(capStaleness('RSO', new Date('2026-06-02'))?.stale).toBe(false);
  });

  it('flags RSO as pending once the new-formula period begins', () => {
    const s = capStaleness('RSO', new Date('2026-08-01'));
    expect(s?.stale).toBe(true);
    expect(s?.reason).toBe('pending publication');
  });
});

describe('stalenessMessage', () => {
  it('mentions the expected update date when present', () => {
    const msg = stalenessMessage({ stale: true, reason: 'past expected update', expectedUpdate: '2026-08-01' });
    expect(msg).toContain('2026-08-01');
    expect(msg.toLowerCase()).toContain('lahd');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/content/rights.test.ts`
Expected: FAIL — `capStaleness` / `stalenessMessage` are not exported.

- [ ] **Step 3: Implement the helpers**

In `lib/content/rights.ts`, add to the imports at the top:
```ts
import { stalenessFor, Staleness } from '@/lib/legal/staleness';
```

At the end of `lib/content/rights.ts`, append:
```ts
export function capStaleness(regime: Regime, onDate = new Date()): Staleness | null {
  if (regime === 'RSO') return stalenessFor(LEGAL.rsoCapPct, onDate);
  if (regime === 'AB1482') return stalenessFor(LEGAL.ab1482CapPct, onDate);
  return null;
}

export function stalenessMessage(s: Staleness): string {
  const when = s.expectedUpdate ? ` around ${s.expectedUpdate}` : '';
  if (s.reason === 'pending publication') {
    return `This figure is pending LAHD publication${when}. Confirm the latest with LAHD.`;
  }
  if (s.reason === 'past expected update') {
    return `This figure was due to update${when}. Confirm the latest with LAHD.`;
  }
  return 'This figure may be out of date. Confirm the latest with LAHD.';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/content/rights.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**
```powershell
git add lib/content/rights.ts tests/content/rights.test.ts
git commit -m "feat(content): cap staleness lookup + message formatter"
```

---

## Task 6: get-help directory — data (web-verified) + `orgsFor`

**Files:**
- Create: `lib/content/help.ts`
- Test: `tests/content/help.test.ts`

> This task gathers REAL, current data. The test pins the shape and the required organizations; the data itself must be verified via the web before writing.

- [ ] **Step 1: Write the failing test**

Create `tests/content/help.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { HELP_ORGS, orgsFor } from '@/lib/content/help';

describe('HELP_ORGS', () => {
  it('every org has a name, https url, and at least one tag', () => {
    expect(HELP_ORGS.length).toBeGreaterThanOrEqual(5);
    for (const o of HELP_ORGS) {
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.url.startsWith('https://')).toBe(true);
      expect(o.tags.length).toBeGreaterThan(0);
    }
  });

  it('includes the four named partner organizations + a county resource', () => {
    const blob = HELP_ORGS.map((o) => o.name.toLowerCase()).join(' | ');
    expect(blob).toContain('lahd');
    expect(blob).toContain('stay housed');
    expect(blob).toContain('saje');
    expect(blob).toContain('legal aid'); // LAFLA = Legal Aid Foundation of Los Angeles
    expect(HELP_ORGS.some((o) => o.tags.includes('county'))).toBe(true);
  });

  it('puts a county resource first for unincorporated county', () => {
    const list = orgsFor({ unincorporatedCounty: true });
    expect(list[0].tags).toContain('county');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/content/help.test.ts`
Expected: FAIL — cannot find module `@/lib/content/help`.

- [ ] **Step 3: Verify org data via the web**

Use WebSearch/WebFetch (or dispatch parallel research agents via superpowers:dispatching-parallel-agents) to confirm the **current** homepage URL and tenant-help phone number for each organization. Required set (must appear, names must contain the test tokens):
- **LAHD** — LA Housing Department (city). Name must contain "LAHD". (M1 already shows its hotline 866-557-7368 — re-verify.)
- **Stay Housed LA** — tenant defense partnership (workshop/legal-aid). Name must contain "Stay Housed".
- **SAJE** — Strategic Actions for a Just Economy (legal-aid/workshop). Name must contain "SAJE".
- **LAFLA** — Legal Aid Foundation of Los Angeles (legal-aid). Name must contain "Legal Aid".
- **LA County DCBA** — Dept. of Consumer & Business Affairs / County rent program (county). Provides the `county` tag for unincorporated addresses.

Also research and, if verified, add other legitimate LA renter resources (candidates: Coalition for Economic Survival (CES), Eviction Defense Network, Inner City Law Center, Neighborhood Legal Services of LA County, LA Tenants Union, Tenant Power Hotline). **Do not add any org whose URL/phone you could not verify** — a dead link erodes trust. Minimum 5 orgs total (the required set already meets this).

- [ ] **Step 4: Implement `help.ts` with verified data**

Create `lib/content/help.ts`. Use this exact interface and `orgsFor`; fill `HELP_ORGS` with the verified data from Step 3 (the LAHD entry below is a format exemplar — re-verify its values before committing):
```ts
export interface HelpOrg {
  name: string;
  description: string; // EN, one line
  url: string; // current, web-verified
  phone?: string; // current, web-verified
  languages?: string[];
  tags: ('city' | 'legal-aid' | 'workshop' | 'hotline' | 'county')[];
}

export const HELP_ORGS: HelpOrg[] = [
  {
    name: 'LAHD (LA Housing Department)',
    description: 'The City of LA agency that administers the RSO. Confirm your rent-law status and file complaints.',
    url: 'https://housing.lacity.gov',
    phone: '(866) 557-7368',
    languages: ['English', 'Spanish'],
    tags: ['city', 'hotline'],
  },
  // ... remaining verified orgs from Step 3:
  //   Stay Housed LA, SAJE, LAFLA (Legal Aid Foundation of Los Angeles),
  //   LA County DCBA (tags include 'county'), + any other verified orgs.
];

export function orgsFor(opts: { unincorporatedCounty?: boolean } = {}): HelpOrg[] {
  if (opts.unincorporatedCounty) {
    const county = HELP_ORGS.filter((o) => o.tags.includes('county'));
    const rest = HELP_ORGS.filter((o) => !o.tags.includes('county'));
    return [...county, ...rest];
  }
  return HELP_ORGS;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/content/help.test.ts`
Expected: PASS (3 passed). If the "four named + county" test fails, a required org is missing or misnamed — fix the data, not the test.

- [ ] **Step 6: Commit**
```powershell
git add lib/content/help.ts tests/content/help.test.ts
git commit -m "feat(content): web-verified get-help organization directory"
```

---

## Task 7: `GetHelp` component

**Files:**
- Create: `components/GetHelp.tsx`

> No unit test (presentational server component, no logic beyond `orgsFor`, which Task 6 covers). Verified in Task 8's manual run.

- [ ] **Step 1: Create the component**

Create `components/GetHelp.tsx`:
```tsx
import { orgsFor } from '@/lib/content/help';

export function GetHelp({ unincorporatedCounty = false }: { unincorporatedCounty?: boolean }) {
  const orgs = orgsFor({ unincorporatedCounty });
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">Get free help</h2>
      <ul className="mt-2 space-y-3">
        {orgs.map((o) => (
          <li key={o.name} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm font-semibold">{o.name}</p>
            <p className="text-sm text-gray-600">{o.description}</p>
            <div className="mt-1 flex gap-3 text-sm">
              <a className="text-blue-600 underline" href={o.url} target="_blank" rel="noopener noreferrer">
                Website
              </a>
              {o.phone && (
                <a className="text-blue-600 underline" href={`tel:${o.phone.replace(/[^0-9+]/g, '')}`}>
                  {o.phone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Type-check via build-free TS (quick compile check)**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**
```powershell
git add components/GetHelp.tsx
git commit -m "feat(ui): GetHelp directory component"
```

---

## Task 8: UI wiring — condo question, staleness marker, GetHelp

**Files:**
- Modify: `components/ConfirmingQuestions.tsx` (add `IS_CONDO` to `QUESTION_TEXT`)
- Modify: `components/ResultCard.tsx` (inline staleness marker)
- Modify: `app/page.tsx` (render `<GetHelp>` + pass unincorporated flag)

- [ ] **Step 1: Add the condo question text**

In `components/ConfirmingQuestions.tsx`, add this entry to the `QUESTION_TEXT` map (after the `AB1482_EXEMPTION_NOTICE` entry):
```tsx
  IS_CONDO: { q: 'Is this an individually-owned condominium (not a rental apartment)?', yes: 'Yes, a condo', no: 'No, a rental apartment', key: 'isCondo', yesValue: true },
```

- [ ] **Step 2: Add the staleness marker to `ResultCard`**

In `components/ResultCard.tsx`, update the import line:
```tsx
import { RIGHTS_TEXT, capLabel } from '@/lib/content/rights';
```
to:
```tsx
import { RIGHTS_TEXT, capLabel, capStaleness, stalenessMessage } from '@/lib/content/rights';
```

Inside the `result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN'` block, replace:
```tsx
          <p className="mt-3 text-sm text-gray-500">Legal annual increase (current)</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime)}</p>
```
with:
```tsx
          <p className="mt-3 text-sm text-gray-500">Legal annual increase (current)</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime)}</p>
          {(() => {
            const s = capStaleness(result.regime);
            return s?.stale ? <p className="mt-1 text-xs text-gray-400">⚠ {stalenessMessage(s)}</p> : null;
          })()}
```

- [ ] **Step 3: Wire `GetHelp` into the page**

In `app/page.tsx`, add to the imports (after the `Disclaimer` import):
```tsx
import { GetHelp } from '@/components/GetHelp';
```

Replace the `<Disclaimer lastVerified={data.lastVerified} />` line:
```tsx
          <Disclaimer lastVerified={data.lastVerified} />
```
with:
```tsx
          <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null} />
          <Disclaimer lastVerified={data.lastVerified} />
```

- [ ] **Step 4: Build to confirm everything compiles**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 5: Manual verification (live APIs)**

Run: `npm run dev`, then in a browser at `http://localhost:3000`:
- `1411 Murray Dr, Los Angeles` → RSO, High confidence, "up to 3%", **no** staleness marker (within period), get-help directory shows the verified orgs.
- A post-2011 multi-unit LA address you know → "Likely: LA Just Cause Ordinance (citywide)" with the "within the last 15 years" reason (AB1482 exemption).
- A small multi-unit (2–4) LA address with an ambiguous use code → the **condo** question appears; answering "Yes, a condo" re-routes toward the single-family/condo result.
- An unincorporated-county address (or any where Census returns no place) → the unincorporated-county message + DCBA listed first under get-help.

- [ ] **Step 6: Commit**
```powershell
git add components/ConfirmingQuestions.tsx components/ResultCard.tsx app/page.tsx
git commit -m "feat(ui): condo question, inline staleness marker, get-help directory"
```

---

## Task 9: Final suite + build + finish

**Files:** none (verification + branch completion)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites green (M1 27 + new engine/staleness/rights/help cases).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds, no type errors; `/` static, `/api/lookup` dynamic.

- [ ] **Step 3: Complete the development branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, present merge/PR/keep/discard options, and execute the choice.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §2.1(A) 15-yr exemption → Task 1. §2.1(C) unincorporated county → Task 2. §2.1(B) condo + `useCodeKind` → Task 3. §2.2 staleness data + helper → Task 4. §2.4 ResultCard marker formatter (`capStaleness`/`stalenessMessage`) → Task 5; marker render → Task 8 Step 2. §2.3 get-help data + `orgsFor` → Task 6; `GetHelp` → Task 7; render → Task 8 Step 3. §5 tests → Tasks 1-6 (Vitest); manual run → Task 8 Step 5. EN-only, no rent-checker, E2E deferred → respected (no such tasks).
- **Placeholder scan:** The only deferred-data step is Task 6 Step 3-4 (get-help org URLs/phones), which is an explicit web-verification step gated by a shape+membership test — not a placeholder. `useCodeKind` ships a concrete, conservative mapping with a documented extension point. No "TODO/TBD" steps.
- **Type consistency:** `now?: Date` added to `ResolveInput` (Task 1) and consumed in the same file. `IS_CONDO`/`isCondo` defined in Task 3 before use in Task 8. `useCodeKind` returns the same 4-member union referenced by the condo trigger. `Staleness` defined in Task 4, imported by `rights.ts` (Task 5) and `ResultCard` (Task 8). `stalenessFor`/`selectDated`/`DatedValue` signatures consistent across Tasks 4-5. `orgsFor({ unincorporatedCounty })` signature identical in Tasks 6, 7, 8.
- **Determinism fix:** Task 1 Step 1 updates the existing M1 post-1978 AB1482 test to inject a fixed `now`, preventing wall-clock flakiness introduced by the 15-year rule.

## Out of M2-A scope → future
- **M2-B:** EN/ES i18n (wraps all new strings here). **M2-C:** share link/save. **M2-D:** Playwright E2E + component tests. **M3:** County RSTPO real classification, rent-increase legality checker, deploy hardening. **Parallel:** legal-org review pass.
