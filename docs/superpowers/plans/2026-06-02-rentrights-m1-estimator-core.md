# RentRights M1 — Estimator Core + Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working web app where a user types a City-of-LA address and gets an *honest estimate* of their rent regime (RSO / AB 1482 / JCO-only / out-of-jurisdiction) with a confidence level, the evidence behind it, and confirming questions when data is ambiguous — built on verified public APIs.

**Architecture:** Next.js (App Router) server route proxies three public APIs (US Census Geocoder for jurisdiction → LA County Assessor PAIS for address→AIN → Assessor Rolls FeatureServer for year-built/units/use-code). A pure rules engine maps {jurisdiction, parcel facts, user answers} → {regime, confidence, reasons[], questions[]}. Legal figures live in one dated-constants module. No database, no PII storage; results computed per request. Evidence-first result UI (option C).

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, Vitest. Node 20+. English only in M1 (i18n is M2).

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-design.md`

**Conventions:** Import alias `@/*` = repo root. Tests colocated under `tests/`. Pure parsers are unit-tested with JSON fixtures (no network in tests); fetch wrappers accept an injectable `fetchImpl` so they can be tested with a fake. Commit after every green step.

---

## File Structure

- `lib/legal/constants.ts` — dated legal figures (RSO cap, AB1482 cap, notice periods, relocation, cutoffs) + `lastVerified`
- `lib/legal/select.ts` — date-based selector for dated values
- `lib/rules/types.ts` — shared domain types (Regime, Confidence, Jurisdiction, ParcelFacts, UserAnswers, QuestionId, RegimeResult)
- `lib/rules/engine.ts` — pure `resolveRegime()` decision function (the heart)
- `lib/clients/census.ts` — `parseJurisdiction()` + `fetchJurisdiction()`
- `lib/clients/assessor.ts` — `parseAin()`, `parseParcelFacts()`, `fetchParcel()`
- `lib/compute/lookup.ts` — orchestration: address (+answers) → `LookupResult`
- `app/api/lookup/route.ts` — POST endpoint
- `app/page.tsx`, `components/*` — minimal vertical-slice UI (address → result)
- `lib/content/rights.ts` — per-regime rights summary text (EN, M1)
- `tests/**` — Vitest specs + fixtures

---

## Task 0: Scaffold the Next.js app into the existing repo

**Files:**
- Create: Next.js app files (via create-next-app), `vitest.config.ts`, `package.json` scripts

- [ ] **Step 1: Scaffold into a temp folder (repo root is non-empty)**

The repo already contains `.git`, `.gitignore`, `docs/`, `.superpowers/`. `create-next-app` refuses non-empty dirs, so scaffold in a temp subfolder and move the files up.

Run (PowerShell, from repo root `C:\Users\SIHYEONG\Documents\GitHub\rentrights`):
```powershell
npx create-next-app@latest _scaffold --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
# Move everything (incl. dotfiles) up, except the temp's own .git (it has none) 
Get-ChildItem -Path _scaffold -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
  Move-Item -Path $_.FullName -Destination . -Force
}
Remove-Item _scaffold -Recurse -Force
# create-next-app overwrote .gitignore; re-add our ignore for .superpowers
Add-Content .gitignore "`n# Brainstorm mockups`n.superpowers/"
```
Expected: `package.json`, `app/`, `tsconfig.json`, `next.config.*`, `tailwind` config present in repo root.

- [ ] **Step 2: Install test tooling**

Run:
```powershell
npm install -D vitest
```
Expected: vitest in devDependencies.

- [ ] **Step 3: Add `vitest.config.ts`**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 4: Add test script to `package.json`**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Smoke test the toolchain**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('toolchain', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```
Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**
```powershell
git add -A
git commit -m "chore: scaffold Next.js app + Vitest"
```

---

## Task 1: Legal constants + dated selector

**Files:**
- Create: `lib/legal/select.ts`, `lib/legal/constants.ts`
- Test: `tests/legal/select.test.ts`

- [ ] **Step 1: Write the failing test for the selector**

Create `tests/legal/select.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { selectDated, DatedValue } from '@/lib/legal/select';

const items: DatedValue<number>[] = [
  { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD' },
  { value: 8.0, effectiveFrom: '2026-07-01', source: 'LAHD' },
];

describe('selectDated', () => {
  it('picks the value whose range contains the date', () => {
    expect(selectDated(items, new Date('2026-01-15'))?.value).toBe(3);
  });
  it('picks an open-ended (no effectiveTo) range', () => {
    expect(selectDated(items, new Date('2026-09-01'))?.value).toBe(8.0);
  });
  it('returns null when no range matches', () => {
    expect(selectDated(items, new Date('2020-01-01'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/legal/select.test.ts`
Expected: FAIL — cannot find module `@/lib/legal/select`.

- [ ] **Step 3: Implement the selector**

Create `lib/legal/select.ts`:
```ts
export interface DatedValue<T> {
  value: T;
  effectiveFrom: string; // 'YYYY-MM-DD'
  effectiveTo?: string;  // inclusive
  source: string;
  note?: string;
}

export function selectDated<T>(items: DatedValue<T>[], onDate: Date): DatedValue<T> | null {
  const d = onDate.toISOString().slice(0, 10);
  for (const it of items) {
    if (it.effectiveFrom <= d && (it.effectiveTo === undefined || d <= it.effectiveTo)) {
      return it;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/legal/select.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Add the verified constants module (no test — it is data)**

Create `lib/legal/constants.ts` (figures verified 2026-06-02 against LAHD / CA Civil Code — see spec §7):
```ts
import { DatedValue } from './select';

export interface RsoCapPeriod extends DatedValue<number | null> {
  floorPct?: number;
  ceilingPct?: number;
}

export const LEGAL = {
  lastVerified: '2026-06-02',

  // RSO eligibility: certificate of occupancy on or before Oct 1, 1978.
  rsoBuildCutoffYear: 1978,
  rsoBuildCutoffNote: 'CO on or before October 1, 1978',

  // RSO allowable annual increase (%). null = pending LAHD publication for that period.
  rsoCapPct: [
    { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD' },
    { value: null, floorPct: 1, ceilingPct: 4, effectiveFrom: '2026-07-01', source: 'LAHD',
      note: 'New formula: 90% of CPI, floor 1% / ceiling 4%. LAHD publishes the exact % ~July 1.' },
  ] as RsoCapPeriod[],

  // AB 1482 allowable annual increase (%) for the LA metro region.
  ab1482CapPct: [
    { value: 8.0, effectiveFrom: '2025-08-01', effectiveTo: '2026-07-31', source: 'CA Civ §1947.12 / CPI' },
    { value: 8.7, effectiveFrom: '2026-08-01', effectiveTo: '2027-07-31', source: 'CA Civ §1947.12 / CPI' },
  ] as DatedValue<number>[],

  // Rent-increase notice periods (CA Civ §827, amended SB1103 eff. 2025-01-01).
  notice: { smallIncreaseDays: 30, largeIncreaseDays: 90, largeThresholdPct: 10, mailExtraDays: 5 },

  // Relocation assistance (LA City RSO, eff. 2025-07-01) and AB1482.
  relocation: {
    rsoEligible: { lt3yr: 10650, gte3yr: 13950 },
    rsoQualified: { lt3yr: 22450, gte3yr: 26550 },
    ab1482Months: 1,
    source: 'LAHD relocation bulletin 2025-26',
  },
} as const;
```

- [ ] **Step 6: Commit**
```powershell
git add lib/legal tests/legal
git commit -m "feat(legal): dated legal-constants module + selector"
```

---

## Task 2: Rules types + engine (the heart)

**Files:**
- Create: `lib/rules/types.ts`, `lib/rules/engine.ts`
- Test: `tests/rules/engine.test.ts`

- [ ] **Step 1: Define the domain types (no test — type declarations)**

Create `lib/rules/types.ts`:
```ts
export type Regime = 'RSO' | 'AB1482' | 'JCO_ONLY' | 'OUT_OF_JURISDICTION' | 'UNKNOWN';
export type Confidence = 'high' | 'medium' | 'low';

// M1 confirming questions (condo-conversion & 15-yr-exemption nuances are M2).
export type QuestionId =
  | 'BUILT_BEFORE_OCT_1978'
  | 'IS_SEPARATE_HOUSE'
  | 'AB1482_EXEMPTION_NOTICE';

export interface Jurisdiction {
  inLACity: boolean;
  placeName: string | null;
  incorporated: boolean;
}

export interface ParcelFacts {
  yearBuilt: number | null;
  units: number | null;
  useCode: string | null;
}

export interface UserAnswers {
  builtBeforeOct1978?: boolean;
  isSeparateHouse?: boolean;        // true => the 2nd unit is an ADU/guest house (treat as single-family)
  hasAb1482ExemptionNotice?: boolean;
}

export interface RegimeResult {
  regime: Regime;
  confidence: Confidence;
  reasons: string[];
  questions: QuestionId[];
}
```

- [ ] **Step 2: Write the failing engine tests**

Create `tests/rules/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveRegime } from '@/lib/rules/engine';
import { Jurisdiction } from '@/lib/rules/types';

const LA: Jurisdiction = { inLACity: true, placeName: 'Los Angeles city', incorporated: true };
const WEHO: Jurisdiction = { inLACity: false, placeName: 'West Hollywood city', incorporated: true };

describe('resolveRegime', () => {
  it('flags out-of-jurisdiction addresses', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 1950, units: 4, useCode: '0500' } });
    expect(r.regime).toBe('OUT_OF_JURISDICTION');
    expect(r.confidence).toBe('high');
  });

  it('classifies a pre-1978 multi-unit LA building as RSO with high confidence (1411 Murray Dr)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1931, units: 6, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('high');
    expect(r.questions).toHaveLength(0);
  });

  it('classifies a post-1978 multi-unit building as AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2010, units: 8, useCode: '0500' } });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('high');
  });

  it('asks the CO-date question when yearBuilt is exactly 1978', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1978, units: 4, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toContain('BUILT_BEFORE_OCT_1978');
  });

  it('asks separate-house when there are exactly 2 units', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1925, units: 2, useCode: '0500' } });
    expect(r.questions).toContain('IS_SEPARATE_HOUSE');
  });

  it('treats a single-family with no exemption answer as JCO-only, low confidence, asks exemption', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1995, units: 1, useCode: '0100' } });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.confidence).toBe('low');
    expect(r.questions).toContain('AB1482_EXEMPTION_NOTICE');
  });

  it('applies AB1482 to a single-family when landlord gave no exemption notice', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1995, units: 1, useCode: '0100' }, answers: { hasAb1482ExemptionNotice: false } });
    expect(r.regime).toBe('AB1482');
  });

  it('returns UNKNOWN and asks when parcel facts are missing', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: null, units: null, useCode: null } });
    expect(r.regime).toBe('UNKNOWN');
    expect(r.questions).toContain('BUILT_BEFORE_OCT_1978');
    expect(r.questions).toContain('IS_SEPARATE_HOUSE');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: FAIL — cannot find `@/lib/rules/engine`.

- [ ] **Step 4: Implement the engine**

Create `lib/rules/engine.ts`:
```ts
import { LEGAL } from '@/lib/legal/constants';
import { Confidence, Jurisdiction, ParcelFacts, QuestionId, RegimeResult, UserAnswers } from './types';

export interface ResolveInput {
  jurisdiction: Jurisdiction;
  facts: ParcelFacts;
  answers?: UserAnswers;
}

export function resolveRegime({ jurisdiction, facts, answers = {} }: ResolveInput): RegimeResult {
  if (!jurisdiction.inLACity) {
    const where = jurisdiction.placeName ?? 'This address';
    return {
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [`${where} is outside the City of Los Angeles`],
      questions: [],
    };
  }

  const reasons: string[] = ['In the City of Los Angeles'];
  const questions: QuestionId[] = [];

  // --- Build era (an explicit answer overrides parcel data) ---
  let builtBefore: boolean | null;
  if (answers.builtBeforeOct1978 !== undefined) {
    builtBefore = answers.builtBeforeOct1978;
    reasons.push(builtBefore ? 'You said it was built before Oct 1, 1978' : 'You said it was built after Oct 1978');
  } else if (facts.yearBuilt == null) {
    builtBefore = null;
    questions.push('BUILT_BEFORE_OCT_1978');
  } else if (facts.yearBuilt < LEGAL.rsoBuildCutoffYear) {
    builtBefore = true;
    reasons.push(`Built in ${facts.yearBuilt} (before the Oct 1, 1978 RSO cutoff)`);
  } else if (facts.yearBuilt > LEGAL.rsoBuildCutoffYear) {
    builtBefore = false;
    reasons.push(`Built in ${facts.yearBuilt} (after the RSO cutoff)`);
  } else {
    builtBefore = null; // exactly 1978 — CO date ambiguous
    reasons.push('Built in 1978 — the exact certificate-of-occupancy date determines RSO coverage');
    questions.push('BUILT_BEFORE_OCT_1978');
  }

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

  const conf = (): Confidence => (questions.length === 0 ? 'high' : 'medium');

  // --- Decision ---
  if (builtBefore === true && multiUnit === true) {
    return { regime: 'RSO', confidence: conf(), reasons, questions };
  }

  if (multiUnit === false && builtBefore !== null) {
    // Single-family / condo: AB1482 unless landlord gave exemption notice. Citywide JCO just-cause always applies.
    if (answers.hasAb1482ExemptionNotice === undefined) {
      questions.push('AB1482_EXEMPTION_NOTICE');
      reasons.push('Single-family/condo may be exempt from AB 1482 rent caps (depends on a landlord notice)');
      return { regime: 'JCO_ONLY', confidence: 'low', reasons, questions };
    }
    if (answers.hasAb1482ExemptionNotice) {
      reasons.push('Landlord gave an AB 1482 exemption notice → no state rent cap, but citywide Just Cause still applies');
      return { regime: 'JCO_ONLY', confidence: 'medium', reasons, questions };
    }
    reasons.push('No AB 1482 exemption notice → AB 1482 rent cap applies');
    return { regime: 'AB1482', confidence: 'medium', reasons, questions };
  }

  if (builtBefore === false && multiUnit === true) {
    reasons.push('Built after the RSO cutoff with multiple units → AB 1482 applies');
    return { regime: 'AB1482', confidence: conf(), reasons, questions };
  }

  // Not enough information yet.
  if (!questions.includes('BUILT_BEFORE_OCT_1978') && builtBefore === null) questions.push('BUILT_BEFORE_OCT_1978');
  if (!questions.includes('IS_SEPARATE_HOUSE') && multiUnit === null) questions.push('IS_SEPARATE_HOUSE');
  return { regime: 'UNKNOWN', confidence: 'low', reasons, questions };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: 8 passed.

- [ ] **Step 6: Commit**
```powershell
git add lib/rules tests/rules
git commit -m "feat(rules): pure regime-resolution engine with confidence + confirming questions"
```

---

## Task 3: Census jurisdiction client

**Files:**
- Create: `lib/clients/census.ts`, `tests/fixtures/census-la.json`, `tests/fixtures/census-weho.json`
- Test: `tests/clients/census.test.ts`

- [ ] **Step 1: Add fixtures (trimmed real responses)**

Create `tests/fixtures/census-la.json`:
```json
{ "result": { "addressMatches": [
  { "matchedAddress": "1411 MURRAY DR, LOS ANGELES, CA, 90026",
    "geographies": { "Incorporated Places": [ { "NAME": "Los Angeles city", "GEOID": "0644000" } ] } }
] } }
```

Create `tests/fixtures/census-weho.json`:
```json
{ "result": { "addressMatches": [
  { "matchedAddress": "8400 SUNSET BLVD, WEST HOLLYWOOD, CA, 90069",
    "geographies": { "Incorporated Places": [ { "NAME": "West Hollywood city", "GEOID": "0684410" } ] } }
] } }
```

Create `tests/fixtures/census-nomatch.json`:
```json
{ "result": { "addressMatches": [] } }
```

- [ ] **Step 2: Write the failing parser tests**

Create `tests/clients/census.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseJurisdiction, fetchJurisdiction } from '@/lib/clients/census';
import la from '../fixtures/census-la.json';
import weho from '../fixtures/census-weho.json';
import nomatch from '../fixtures/census-nomatch.json';

describe('parseJurisdiction', () => {
  it('detects City of LA', () => {
    const j = parseJurisdiction(la);
    expect(j).toEqual({ inLACity: true, placeName: 'Los Angeles city', incorporated: true });
  });
  it('detects a non-LA city', () => {
    expect(parseJurisdiction(weho)).toEqual({ inLACity: false, placeName: 'West Hollywood city', incorporated: true });
  });
  it('returns null when no address match', () => {
    expect(parseJurisdiction(nomatch)).toBeNull();
  });
});

describe('fetchJurisdiction', () => {
  it('uses the injected fetch and returns parsed jurisdiction', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => la }) as unknown as Response;
    const j = await fetchJurisdiction('1411 Murray Dr, Los Angeles, CA', fakeFetch);
    expect(j?.inLACity).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/clients/census.test.ts`
Expected: FAIL — cannot find `@/lib/clients/census`.

- [ ] **Step 4: Implement the client**

Create `lib/clients/census.ts`:
```ts
import { Jurisdiction } from '@/lib/rules/types';

type FetchLike = (url: string) => Promise<Response>;

const BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

export function parseJurisdiction(json: any): Jurisdiction | null {
  const match = json?.result?.addressMatches?.[0];
  if (!match) return null;
  const place = match.geographies?.['Incorporated Places']?.[0];
  const placeName: string | null = place?.NAME ?? null;
  return {
    inLACity: placeName === 'Los Angeles city',
    placeName,
    incorporated: Boolean(placeName),
  };
}

export async function fetchJurisdiction(address: string, fetchImpl: FetchLike = fetch): Promise<Jurisdiction | null> {
  const url = `${BASE}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&vintage=Current_Current&layers=27&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Census geocoder error: ${res.status}`);
  return parseJurisdiction(await res.json());
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/clients/census.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**
```powershell
git add lib/clients/census.ts tests/clients/census.test.ts tests/fixtures
git commit -m "feat(clients): Census geocoder jurisdiction client + parser"
```

---

## Task 4: Assessor parcel client

**Files:**
- Create: `lib/clients/assessor.ts`, `tests/fixtures/pais.json`, `tests/fixtures/rolls.json`
- Test: `tests/clients/assessor.test.ts`

- [ ] **Step 1: Add fixtures (trimmed real responses for AIN 5425003009)**

Create `tests/fixtures/pais.json`:
```json
{ "features": [ { "attributes": { "AIN": "5425003009", "SAADDR": "1411 MURRAY DR", "SAADDR2": "LOS ANGELES CA 90026" } } ] }
```

Create `tests/fixtures/rolls.json`:
```json
{ "features": [ { "attributes": { "AIN": "5425003009", "RollYear": "2025", "YearBuilt": "1931", "EffectiveYearBuilt": "1933", "Units": 6, "UseCode": "0500", "SitusStreet": "MURRAY DR", "SitusCity": "LOS ANGELES CA" } } ] }
```

Create `tests/fixtures/rolls-empty.json`:
```json
{ "features": [] }
```

- [ ] **Step 2: Write the failing tests**

Create `tests/clients/assessor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseAin, parseParcelFacts, fetchParcel } from '@/lib/clients/assessor';
import pais from '../fixtures/pais.json';
import rolls from '../fixtures/rolls.json';
import rollsEmpty from '../fixtures/rolls-empty.json';

describe('parseAin', () => {
  it('extracts the AIN', () => { expect(parseAin(pais)).toBe('5425003009'); });
  it('returns null when no features', () => { expect(parseAin({ features: [] })).toBeNull(); });
});

describe('parseParcelFacts', () => {
  it('extracts yearBuilt/units/useCode', () => {
    expect(parseParcelFacts(rolls)).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });
  it('returns nulls when no rows', () => {
    expect(parseParcelFacts(rollsEmpty)).toEqual({ yearBuilt: null, units: null, useCode: null });
  });
});

describe('fetchParcel', () => {
  it('chains PAIS then Rolls using injected fetch', async () => {
    const fakeFetch = async (url: string) => {
      const body = url.includes('PAIS') ? pais : rolls;
      return { ok: true, json: async () => body } as unknown as Response;
    };
    const out = await fetchParcel('1411 Murray Dr', fakeFetch);
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('returns null facts when address has no parcel', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ features: [] }) }) as unknown as Response;
    const out = await fetchParcel('nowhere', fakeFetch);
    expect(out.ain).toBeNull();
    expect(out.facts).toEqual({ yearBuilt: null, units: null, useCode: null });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/clients/assessor.test.ts`
Expected: FAIL — cannot find `@/lib/clients/assessor`.

- [ ] **Step 4: Implement the client**

Create `lib/clients/assessor.ts`:
```ts
import { ParcelFacts } from '@/lib/rules/types';

type FetchLike = (url: string) => Promise<Response>;

const PAIS = 'https://assessor.gis.lacounty.gov/assessor/rest/services/PAIS/pais_parcels/MapServer/0/query';
const ROLLS = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Parcel_Data_2021_Table/FeatureServer/0/query';
const LATEST_ROLL_YEAR = '2025';

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseAin(json: any): string | null {
  return json?.features?.[0]?.attributes?.AIN ?? null;
}

export function parseParcelFacts(json: any): ParcelFacts {
  const a = json?.features?.[0]?.attributes;
  if (!a) return { yearBuilt: null, units: null, useCode: null };
  return {
    yearBuilt: toNum(a.YearBuilt),
    units: toNum(a.Units),
    useCode: a.UseCode != null ? String(a.UseCode) : null,
  };
}

// Split a one-line address into a house number + street fragment for PAIS matching.
function splitAddress(address: string): { num: string; street: string } {
  const m = address.trim().match(/^(\d+)\s+(.+?)(?:,|$)/);
  if (!m) return { num: '', street: address };
  const street = m[2].replace(/\b(N|S|E|W)\b\.?\s+/i, '').split(/\s+/)[0]; // first significant token
  return { num: m[1], street: street.toUpperCase() };
}

export async function fetchParcel(
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ain: string | null; facts: ParcelFacts }> {
  const { num, street } = splitAddress(address);
  const paisWhere = encodeURIComponent(`SANUM='${num}' AND SASTR like '%${street}%'`);
  const paisRes = await fetchImpl(`${PAIS}?where=${paisWhere}&outFields=AIN,SAADDR,SAADDR2&returnGeometry=false&f=json`);
  if (!paisRes.ok) throw new Error(`Assessor PAIS error: ${paisRes.status}`);
  const ain = parseAin(await paisRes.json());
  if (!ain) return { ain: null, facts: { yearBuilt: null, units: null, useCode: null } };

  const rollWhere = encodeURIComponent(`AIN='${ain}' AND RollYear='${LATEST_ROLL_YEAR}'`);
  const rollRes = await fetchImpl(`${ROLLS}?where=${rollWhere}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&f=json`);
  if (!rollRes.ok) throw new Error(`Assessor Rolls error: ${rollRes.status}`);
  return { ain, facts: parseParcelFacts(await rollRes.json()) };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/clients/assessor.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Commit**
```powershell
git add lib/clients/assessor.ts tests/clients/assessor.test.ts tests/fixtures/pais.json tests/fixtures/rolls.json tests/fixtures/rolls-empty.json
git commit -m "feat(clients): LA County Assessor parcel client (PAIS + Rolls) + parsers"
```

---

## Task 5: Compute orchestration

**Files:**
- Create: `lib/compute/lookup.ts`
- Test: `tests/compute/lookup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/compute/lookup.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { Jurisdiction, ParcelFacts } from '@/lib/rules/types';

const deps = (j: Jurisdiction | null, facts: ParcelFacts) => ({
  getJurisdiction: async () => j,
  getParcel: async () => ({ ain: '1', facts }),
});

describe('lookup', () => {
  it('returns an RSO result for a pre-1978 multi-unit LA address', async () => {
    const res = await lookup('1411 Murray Dr', {}, deps(
      { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
      { yearBuilt: 1931, units: 6, useCode: '0500' },
    ));
    expect(res.result.regime).toBe('RSO');
    expect(res.facts.units).toBe(6);
  });

  it('throws AddressNotFoundError when the geocoder finds nothing', async () => {
    await expect(lookup('nowhere', {}, deps(null, { yearBuilt: null, units: null, useCode: null })))
      .rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it('adds a data warning when parcel facts are missing', async () => {
    const res = await lookup('x', {}, deps(
      { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
      { yearBuilt: null, units: null, useCode: null },
    ));
    expect(res.dataWarnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/compute/lookup.test.ts`
Expected: FAIL — cannot find `@/lib/compute/lookup`.

- [ ] **Step 3: Implement the orchestration**

Create `lib/compute/lookup.ts`:
```ts
import { fetchJurisdiction } from '@/lib/clients/census';
import { fetchParcel } from '@/lib/clients/assessor';
import { resolveRegime } from '@/lib/rules/engine';
import { Jurisdiction, ParcelFacts, RegimeResult, UserAnswers } from '@/lib/rules/types';
import { LEGAL } from '@/lib/legal/constants';

export class AddressNotFoundError extends Error {
  constructor(address: string) { super(`Address not found: ${address}`); this.name = 'AddressNotFoundError'; }
}

export interface LookupResult {
  address: string;
  jurisdiction: Jurisdiction;
  facts: ParcelFacts;
  result: RegimeResult;
  dataWarnings: string[];
  lastVerified: string;
}

export interface LookupDeps {
  getJurisdiction: (address: string) => Promise<Jurisdiction | null>;
  getParcel: (address: string) => Promise<{ ain: string | null; facts: ParcelFacts }>;
}

const defaultDeps: LookupDeps = {
  getJurisdiction: (a) => fetchJurisdiction(a),
  getParcel: (a) => fetchParcel(a),
};

export async function lookup(
  address: string,
  answers: UserAnswers = {},
  deps: LookupDeps = defaultDeps,
): Promise<LookupResult> {
  const jurisdiction = await deps.getJurisdiction(address);
  if (!jurisdiction) throw new AddressNotFoundError(address);

  const dataWarnings: string[] = [];
  let facts: ParcelFacts = { yearBuilt: null, units: null, useCode: null };

  if (jurisdiction.inLACity) {
    try {
      const parcel = await deps.getParcel(address);
      facts = parcel.facts;
      if (facts.yearBuilt == null || facts.units == null) {
        dataWarnings.push('We could not read full property records for this address, so we will ask you a couple of questions.');
      }
    } catch {
      dataWarnings.push('Property records are temporarily unavailable; answers below are based only on your responses.');
    }
  }

  const result = resolveRegime({ jurisdiction, facts, answers });
  return { address, jurisdiction, facts, result, dataWarnings, lastVerified: LEGAL.lastVerified };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/compute/lookup.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**
```powershell
git add lib/compute tests/compute
git commit -m "feat(compute): address->regime orchestration with graceful data fallback"
```

---

## Task 6: API route `/api/lookup`

**Files:**
- Create: `app/api/lookup/route.ts`
- Test: `tests/api/lookup.test.ts`

- [ ] **Step 1: Write the failing test (call the route handler directly)**

Create `tests/api/lookup.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/compute/lookup', async (orig) => {
  const actual = await orig<typeof import('@/lib/compute/lookup')>();
  return {
    ...actual,
    lookup: vi.fn(async (address: string) => ({
      address, jurisdiction: { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
      facts: { yearBuilt: 1931, units: 6, useCode: '0500' },
      result: { regime: 'RSO', confidence: 'high', reasons: ['In the City of Los Angeles'], questions: [] },
      dataWarnings: [], lastVerified: '2026-06-02',
    })),
  };
});

import { POST } from '@/app/api/lookup/route';

function req(body: unknown) {
  return new Request('http://localhost/api/lookup', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/lookup', () => {
  it('returns a regime result for a valid address', async () => {
    const res = await POST(req({ address: '1411 Murray Dr, Los Angeles' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.regime).toBe('RSO');
  });

  it('400s when address is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/api/lookup.test.ts`
Expected: FAIL — cannot find `@/app/api/lookup/route`.

- [ ] **Step 3: Implement the route**

Create `app/api/lookup/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { UserAnswers } from '@/lib/rules/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { address?: string; answers?: UserAnswers };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: 'An address is required' }, { status: 400 });
  }

  try {
    const result = await lookup(address, body.answers ?? {});
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AddressNotFoundError) {
      return NextResponse.json({ error: 'We could not find that address. Try including the city, e.g. "123 Main St, Los Angeles".' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Something went wrong looking up that address. Please try again.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/api/lookup.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass (Tasks 0–6).

- [ ] **Step 6: Commit**
```powershell
git add app/api/lookup/route.ts tests/api/lookup.test.ts
git commit -m "feat(api): POST /api/lookup endpoint"
```

---

## Task 7: Vertical-slice UI (address → evidence-first result)

**Files:**
- Create: `lib/content/rights.ts`, `components/ResultCard.tsx`, `components/ConfirmingQuestions.tsx`, `components/Disclaimer.tsx`
- Modify: `app/page.tsx`

> M1 UI is English-only and verified manually (component/E2E automation is M2). It implements the option-C evidence-first result.

- [ ] **Step 1: Add per-regime rights summary content**

Create `lib/content/rights.ts`:
```ts
import { LEGAL } from '@/lib/legal/constants';
import { Regime } from '@/lib/rules/types';

export function capLabel(regime: Regime, onDate = new Date()): string {
  const d = onDate.toISOString().slice(0, 10);
  if (regime === 'RSO') {
    const p = LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!p) return 'See LAHD';
    return p.value != null ? `up to ${p.value}%` : `${p.floorPct}–${p.ceilingPct}% (LAHD publishes the exact figure)`;
  }
  if (regime === 'AB1482') {
    const p = LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p ? `up to ${p.value}%` : 'See state guidance';
  }
  return 'No state/local rent cap — but Just Cause protections apply';
}

export const RIGHTS_TEXT: Record<Regime, { title: string; points: string[] }> = {
  RSO: {
    title: 'Rent Stabilization Ordinance (likely)',
    points: [
      'Your landlord generally needs a "just cause" to evict you.',
      'Rent may be increased only once every 12 months.',
      'You may be owed relocation assistance for certain no-fault evictions.',
      'Rent-increase notice: 30 days (≤10%) or 90 days (>10%).',
    ],
  },
  AB1482: {
    title: 'California Tenant Protection Act (AB 1482) (likely)',
    points: [
      'Statewide cap on annual rent increases.',
      'Just-cause eviction protections after 12 months of tenancy.',
      'One month of relocation assistance for no-fault evictions.',
      'Rent-increase notice: 30 days (≤10%) or 90 days (>10%).',
    ],
  },
  JCO_ONLY: {
    title: 'LA Just Cause Ordinance (citywide)',
    points: [
      'Even without a rent cap, your landlord generally needs a "just cause" to evict you (after 6 months).',
      'Rent-increase notice: 30 days (≤10%) or 90 days (>10%).',
      'Confirm whether AB 1482 also caps your rent — see below.',
    ],
  },
  OUT_OF_JURISDICTION: { title: 'Outside the City of Los Angeles', points: ['This tool currently covers the City of LA only. Your city or unincorporated LA County may have its own rules.'] },
  UNKNOWN: { title: 'We need a little more info', points: ['Answer the questions below so we can estimate your rights.'] },
};
```

- [ ] **Step 2: Add the disclaimer + result components**

Create `components/Disclaimer.tsx`:
```tsx
export function Disclaimer({ lastVerified }: { lastVerified: string }) {
  return (
    <p className="mt-6 text-xs text-gray-500">
      ⚠️ This is an estimate based on public records, not a lookup from LAHD&apos;s registry, and is not legal advice.
      Always confirm with LAHD before acting. Legal figures last verified {lastVerified}.
    </p>
  );
}
```

Create `components/ResultCard.tsx`:
```tsx
import { RegimeResult } from '@/lib/rules/types';
import { RIGHTS_TEXT, capLabel } from '@/lib/content/rights';

const CONF_LABEL: Record<string, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

export function ResultCard({ result }: { result: RegimeResult }) {
  const rights = RIGHTS_TEXT[result.regime];
  return (
    <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">What public records show</p>
      <ul className="mt-1 mb-3 list-disc pl-5 text-sm text-gray-700">
        {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      <p className="text-lg font-bold">→ Likely: {rights.title}</p>
      {result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN' && (
        <>
          <span className="mt-1 inline-block rounded-full border border-green-700 bg-green-50 px-3 py-0.5 text-xs font-semibold text-green-700">
            {CONF_LABEL[result.confidence]}
          </span>
          <p className="mt-3 text-sm text-gray-500">Legal annual increase (current)</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime)}</p>
        </>
      )}
      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
        {rights.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
        ⚠️ Not final — confirm with LAHD (866) 557-7368 →
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the confirming-questions component**

Create `components/ConfirmingQuestions.tsx`:
```tsx
'use client';
import { QuestionId, UserAnswers } from '@/lib/rules/types';

const QUESTION_TEXT: Record<QuestionId, { q: string; yes: string; no: string; key: keyof UserAnswers; yesValue: boolean }> = {
  BUILT_BEFORE_OCT_1978: { q: 'Was this building built (certificate of occupancy) before October 1978?', yes: 'Yes, before Oct 1978', no: 'No / not sure it’s after', key: 'builtBeforeOct1978', yesValue: true },
  IS_SEPARATE_HOUSE: { q: 'Is the other unit on the property a separate house (ADU/guest house) rather than an apartment?', yes: 'Yes, a separate house', no: 'No, it’s an apartment building', key: 'isSeparateHouse', yesValue: true },
  AB1482_EXEMPTION_NOTICE: { q: 'Did your landlord give you a written "AB 1482 exemption" notice?', yes: 'Yes', no: 'No', key: 'hasAb1482ExemptionNotice', yesValue: true },
};

export function ConfirmingQuestions({ questions, answers, onAnswer }: {
  questions: QuestionId[];
  answers: UserAnswers;
  onAnswer: (next: UserAnswers) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm font-semibold">A couple of quick questions to improve accuracy:</p>
      {questions.map((id) => {
        const t = QUESTION_TEXT[id];
        return (
          <div key={id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm">{t.q}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [t.key]: t.yesValue })}>{t.yes}</button>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [t.key]: !t.yesValue })}>{t.no}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Wire up the page**

Replace `app/page.tsx` with:
```tsx
'use client';
import { useState } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { Disclaimer } from '@/components/Disclaimer';
import { UserAnswers } from '@/lib/rules/types';

export default function Home() {
  const [address, setAddress] = useState('');
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(addr: string, ans: UserAnswers) {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr, answers: ans }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Error'); setData(null); }
      else setData(json);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-blue-700">RentRights</h1>
      <p className="text-sm text-gray-500">Know your renter rights in the City of LA — free, no sign-up, nothing stored.</p>

      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setAnswers({}); run(address, {}); }}>
        <input className="flex-1 rounded-lg border px-3 py-2" placeholder="1234 S Main St, Los Angeles" value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" disabled={loading}>{loading ? '…' : 'Check'}</button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mt-6">
          <ResultCard result={data.result} />
          {data.result.questions.length > 0 && (
            <ConfirmingQuestions
              questions={data.result.questions}
              answers={answers}
              onAnswer={(next) => { setAnswers(next); run(address, next); }}
            />
          )}
          {data.dataWarnings?.map((w: string, i: number) => (
            <p key={i} className="mt-3 text-xs text-gray-500">{w}</p>
          ))}
          <Disclaimer lastVerified={data.lastVerified} />
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Manual verification (run the app)**

Run: `npm run dev`
Then in a browser at `http://localhost:3000`:
- Enter `1411 Murray Dr, Los Angeles` → Expect: evidence list (Built 1931, 6 units), "Likely: Rent Stabilization Ordinance", High confidence, "up to 3%", amber confirm banner, disclaimer with last-verified date.
- Enter a clearly post-1978 address you know → Expect AB1482 or a confirming question.
- Enter `8400 Sunset Blvd, West Hollywood` → Expect out-of-jurisdiction message.
- Enter gibberish → Expect the friendly "could not find that address" error.

- [ ] **Step 6: Commit**
```powershell
git add app/page.tsx components lib/content
git commit -m "feat(ui): evidence-first vertical slice (address -> result + confirming questions)"
```

---

## Task 8: Trust polish + README + final suite

**Files:**
- Create: `README.md`
- Modify: `app/layout.tsx` (title/metadata)

- [ ] **Step 1: Set app metadata**

In `app/layout.tsx`, set the exported `metadata`:
```ts
export const metadata = {
  title: 'RentRights — LA renter rights, by address',
  description: 'Free, open-source tool that estimates your City of Los Angeles rent-law protections from your address. Not legal advice.',
};
```

- [ ] **Step 2: Write the README**

Create `README.md`:
```markdown
# RentRights (M1)

Free, open-source tool: enter a **City of Los Angeles** address and get an *honest estimate* of your rent regime (RSO / AB 1482 / Just-Cause-only), the legal increase cap, and your rights — with a confidence level and the evidence behind it.

**Important:** This is an estimate from public records (US Census Geocoder + LA County Assessor), **not** a lookup from LAHD's registry, and **not legal advice**. Always confirm with LAHD.

## Develop
- `npm install`
- `npm run dev` → http://localhost:3000
- `npm test`

## Architecture
See `docs/superpowers/specs/2026-06-02-rentrights-design.md` and `docs/superpowers/plans/`.

Legal figures live in `lib/legal/constants.ts` with a `lastVerified` date and per-period effective dates. **Update cadence:** RSO % (Jul 1), AB 1482 % (Aug 1), relocation (Jul 1).
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all suites green.

- [ ] **Step 4: Build to confirm production compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**
```powershell
git add README.md app/layout.tsx
git commit -m "docs: README + app metadata; M1 estimator core complete"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** §3 honest-estimator → Tasks 2,5,7 (evidence + confidence + verify banner). §5 pipeline → Tasks 3,4,5. §5.3 confirming questions → Task 2 (3 of 7 triggers; condo-conversion & 15-yr-exemption deferred to M2, noted). §6 APIs → Tasks 3,4 (verified endpoints). §7 constants → Task 1. §10 error handling → Task 5 (fallback) + Task 6 (404/502) + Task 7 (errors). §11 disclaimers → Tasks 7,8. §12 testing → Tasks 1–6 TDD + Task 7 manual. Geography City-of-LA → engine guard. SMS/i18n/get-help directory → **M2 (out of M1 scope, by design)**.
- **Placeholder scan:** none — every code step contains real code; the only `null` cap value is a real modeled "pending LAHD publication" state with floor/ceiling, surfaced honestly in `capLabel`.
- **Type consistency:** `Jurisdiction`, `ParcelFacts`, `UserAnswers`, `RegimeResult`, `QuestionId` defined in Task 2 and used identically in Tasks 3–7. `fetchJurisdiction`/`fetchParcel`/`resolveRegime`/`lookup` signatures match across tasks. `QuestionId` union (3 members) matches `QUESTION_TEXT` keys in Task 7.

## Out of M1 scope → future plans
- **M2:** EN/ES i18n; get-help directory (LAHD, Stay Housed LA, SAJE) with real links; share-link/save; condo-conversion + AB1482 15-yr-exemption questions; Playwright E2E + component tests; staleness auto-banner past expected update dates; legal-org review pass.
- **M3:** County RSTPO + other cities; "is this proposed increase legal?" checker; deploy hardening (Docker + NPM proxy `rentrights.devmanage.duckdns.org`).
