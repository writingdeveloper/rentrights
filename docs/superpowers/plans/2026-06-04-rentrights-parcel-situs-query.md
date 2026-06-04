# Fast parcel facts via indexed situs query — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cold parcel-facts lookups fast (~1–2s, was 13–55s) by querying the ROLLS table through its indexed `SitusZIP5`+`SitusHouseNo` fields and selecting the exact row by the AIN already obtained from PAIS, with a safe fallback to the existing AIN query.

**Architecture:** All changes are in `lib/clients/assessor.ts` (+ its test and two fixtures). `parcelAtPoint` starts returning the parcel's situs (house number + ZIP) alongside the AIN; a new `fetchRollsBySitus` runs the fast indexed query and selects by AIN; `fetchParcel` tries that first and falls back to the existing `fetchRolls(ain)`. Every fetch keeps the `timeoutFetch()` default from PR #3. No new dependency, datastore, or artifact.

**Tech Stack:** TypeScript, Next.js 16 route clients, Vitest (node env), LA County ArcGIS REST (PAIS + the `Parcel_Data` roll table).

**Spec:** `docs/superpowers/specs/2026-06-04-rentrights-parcel-situs-query-design.md`

---

## File Structure

- **Modify** `lib/clients/assessor.ts` — add `parseHouseNo`, `parseZip`, `selectFactsByAin`, `fetchRollsBySitus`, the `ParcelRef` interface; change `parcelAtPoint` to return `ParcelRef | null`; rewrite `fetchParcel` to use the situs path with AIN fallback. Keep `selectAin`, `fetchRolls`, `parseParcelFacts` unchanged.
- **Modify** `tests/clients/assessor.test.ts` — new tests for the helpers, `parcelAtPoint` situs return, `fetchRollsBySitus`, and the `fetchParcel` situs/fallback paths; update the old `parcelAtPoint` assertion.
- **Modify** `tests/fixtures/pais.json` — add `SANUM` so the fixture matches real PAIS responses.
- **Create** `tests/fixtures/rolls-situs.json` — a multi-candidate situs-query response (several parcels at house #1411 in one ZIP, including ours).

---

## Task 1: Pure helpers — `parseHouseNo`, `parseZip`, `selectFactsByAin`

**Files:**
- Modify: `lib/clients/assessor.ts`
- Test: `tests/clients/assessor.test.ts`

- [ ] **Step 1: Add the failing tests**

Add to the top imports of `tests/clients/assessor.test.ts` (extend the existing import line):

```ts
import {
  selectAin,
  parseParcelFacts,
  parcelAtPoint,
  fetchParcel,
  parseHouseNo,
  parseZip,
  selectFactsByAin,
} from '@/lib/clients/assessor';
```

(`fetchRollsBySitus` is added to this import in Task 2, when it exists.)

Append these describe blocks to `tests/clients/assessor.test.ts`:

```ts
describe('parseHouseNo', () => {
  it('parses a clean house number to a positive integer', () => {
    expect(parseHouseNo('1411')).toBe(1411);
  });
  it('returns null for fractional / ranged / empty / missing', () => {
    expect(parseHouseNo('1411 1/2')).toBeNull();
    expect(parseHouseNo('1411-15')).toBeNull();
    expect(parseHouseNo('')).toBeNull();
    expect(parseHouseNo(undefined)).toBeNull();
  });
});

describe('parseZip', () => {
  it('extracts the 5-digit zip from a situs line', () => {
    expect(parseZip('LOS ANGELES CA 90026')).toBe('90026');
  });
  it('returns null when there is no 5-digit zip', () => {
    expect(parseZip('LOS ANGELES CA')).toBeNull();
    expect(parseZip(undefined)).toBeNull();
  });
});

describe('selectFactsByAin', () => {
  const multi = {
    features: [
      { attributes: { AIN: '5424024020', YearBuilt: '1910', Units: 5, UseCode: '0500' } },
      { attributes: { AIN: '5425003009', YearBuilt: '1931', Units: 6, UseCode: '0500' } },
    ],
  };
  it('parses the facts of the row whose AIN matches', () => {
    expect(selectFactsByAin(multi, '5425003009')).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });
  it('returns null when the AIN is not among the candidates', () => {
    expect(selectFactsByAin(multi, '9999999999')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run tests/clients/assessor.test.ts`
Expected: FAIL — `parseHouseNo`, `parseZip`, `selectFactsByAin` are not exported (import error).

- [ ] **Step 3: Implement the helpers**

In `lib/clients/assessor.ts`, add after `parseParcelFacts` (which stays unchanged):

```ts
/** Leading house number as a positive integer, or null (fractional/ranged/missing situs). */
export function parseHouseNo(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The 5-digit ZIP embedded in a situs line like "LOS ANGELES CA 90026", or null. */
export function parseZip(v: unknown): string | null {
  const m = typeof v === 'string' ? v.match(/\b(\d{5})\b/) : null;
  return m ? m[1] : null;
}

/** Facts of the one candidate row whose AIN matches, or null if it is not in the set. */
export function selectFactsByAin(json: unknown, ain: string): ParcelFacts | null {
  const feats = (json as FeatureCollection)?.features ?? [];
  const match = feats.find((f) => f.attributes?.AIN != null && String(f.attributes.AIN) === ain);
  return match ? parseParcelFacts({ features: [match] }) : null;
}
```

- [ ] **Step 4: Run the test file to verify the helpers pass**

Run: `npx vitest run tests/clients/assessor.test.ts`
Expected: PASS — the 3 new helper describe blocks pass, and the existing tests are unaffected (`parcelAtPoint` still returns a string in this task).

- [ ] **Step 5: Commit**

```bash
git add lib/clients/assessor.ts tests/clients/assessor.test.ts
git commit -m "feat(assessor): situs parsing helpers + selectFactsByAin"
```

---

## Task 2: `fetchRollsBySitus` — indexed query + select by AIN

**Files:**
- Modify: `lib/clients/assessor.ts`
- Create: `tests/fixtures/rolls-situs.json`
- Test: `tests/clients/assessor.test.ts`

- [ ] **Step 1: Create the multi-candidate fixture**

Create `tests/fixtures/rolls-situs.json` (several parcels at house #1411 in ZIP 90026, including ours):

```json
{ "features": [
  { "attributes": { "AIN": "5424024020", "YearBuilt": "1910", "Units": 5, "UseCode": "0500" } },
  { "attributes": { "AIN": "5427014021", "YearBuilt": "1911", "Units": 1, "UseCode": "0100" } },
  { "attributes": { "AIN": "5425003009", "YearBuilt": "1931", "Units": 6, "UseCode": "0500" } }
] }
```

- [ ] **Step 2: Add the failing test**

First, add `fetchRollsBySitus` to the existing `@/lib/clients/assessor` import (the one extended in Task 1), so it now reads:

```ts
import {
  selectAin,
  parseParcelFacts,
  parcelAtPoint,
  fetchParcel,
  parseHouseNo,
  parseZip,
  selectFactsByAin,
  fetchRollsBySitus,
} from '@/lib/clients/assessor';
```

Add the fixture import near the other fixture imports at the top of `tests/clients/assessor.test.ts`:

```ts
import rollsSitus from '../fixtures/rolls-situs.json';
```

Append this describe block:

```ts
describe('fetchRollsBySitus', () => {
  it('queries the indexed situs fields (no AIN scan) and selects our parcel by AIN', async () => {
    let url = '';
    const fakeFetch = async (u: string) => {
      url = u;
      return { ok: true, json: async () => rollsSitus } as unknown as Response;
    };
    const facts = await fetchRollsBySitus('5425003009', '90026', 1411, fakeFetch);
    expect(facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("SitusZIP5='90026'");
    expect(decoded).toContain('SitusHouseNo=1411');
    expect(decoded).toContain("RollYear='2025'");
    expect(decoded).not.toContain('AIN='); // must not fall back to the unindexed scan
  });

  it('returns null when our AIN is not among the candidates (so fetchParcel can fall back)', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => rollsSitus }) as unknown as Response;
    expect(await fetchRollsBySitus('9999999999', '90026', 1411, fakeFetch)).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/clients/assessor.test.ts -t "fetchRollsBySitus"`
Expected: FAIL — `fetchRollsBySitus` is not defined.

- [ ] **Step 4: Implement `fetchRollsBySitus`**

In `lib/clients/assessor.ts`, add after `fetchRolls` (which stays unchanged):

```ts
/**
 * Fast path for parcel facts: query the roll table through its INDEXED situs
 * fields (`SitusZIP5` + `SitusHouseNo`) — which return in ~0.3–1.5s — then pick
 * the row whose AIN matches. (`where=AIN='…'` is unindexed upstream and scans
 * ~2.4M rows in 13–55s; see the design doc.) `zip` is a validated 5-digit string
 * and `houseNo` a number, so neither can break out of the where clause. Returns
 * null when our parcel is not in the candidate set, so the caller can fall back.
 */
export async function fetchRollsBySitus(
  ain: string,
  zip: string,
  houseNo: number,
  fetchImpl: FetchLike = timeoutFetch(),
): Promise<ParcelFacts | null> {
  const where = encodeURIComponent(
    `SitusZIP5='${zip}' AND SitusHouseNo=${houseNo} AND RollYear='${LATEST_ROLL_YEAR}'`,
  );
  const res = await fetchImpl(
    `${ROLLS}?where=${where}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&resultRecordCount=50&f=json`,
  );
  if (!res.ok) throw new Error(`Assessor Rolls (situs) error: ${res.status}`);
  return selectFactsByAin(await res.json(), ain);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/clients/assessor.test.ts -t "fetchRollsBySitus"`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/clients/assessor.ts tests/clients/assessor.test.ts tests/fixtures/rolls-situs.json
git commit -m "feat(assessor): fetchRollsBySitus — indexed situs query + AIN select"
```

---

## Task 3: `parcelAtPoint` returns situs + `fetchParcel` situs-first orchestration

This is the coupled change: `parcelAtPoint`'s new return type and its consumer `fetchParcel` are updated together so the suite ends green.

**Files:**
- Modify: `lib/clients/assessor.ts`
- Modify: `tests/fixtures/pais.json`
- Test: `tests/clients/assessor.test.ts`

- [ ] **Step 1: Update the PAIS fixture to include `SANUM`**

Replace the contents of `tests/fixtures/pais.json` with:

```json
{ "features": [ { "attributes": { "AIN": "5425003009", "SANUM": "1411", "SAADDR": "1411 MURRAY DR", "SAADDR2": "LOS ANGELES CA 90026" } } ] }
```

- [ ] **Step 2: Update the old `parcelAtPoint` test and add the `fetchParcel` situs/fallback tests**

In `tests/clients/assessor.test.ts`, **replace** the existing `describe('parcelAtPoint', …)` block with:

```ts
describe('parcelAtPoint', () => {
  it('queries PAIS with the point and returns the AIN + situs (house no, zip)', async () => {
    let captured = '';
    const fakeFetch = async (url: string) => {
      captured = url;
      return { ok: true, json: async () => pais } as unknown as Response;
    };
    expect(await parcelAtPoint(POINT, fakeFetch)).toEqual({ ain: '5425003009', houseNo: 1411, zip: '90026' });
    expect(captured).toContain('esriGeometryPoint');
    expect(captured).toContain('inSR=102645');
    expect(captured).toContain('SANUM'); // situs fields requested
    expect(captured).not.toContain('resultRecordCount'); // 400s on the PAIS endpoint
  });

  it('returns null when the point matches no single parcel', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ features: [] }) }) as unknown as Response;
    expect(await parcelAtPoint(POINT, fakeFetch)).toBeNull();
  });
});
```

Then append these `fetchParcel` path tests (the existing `describe('fetchParcel', …)` block stays):

```ts
describe('fetchParcel (situs path)', () => {
  // Route by URL: CAMS -> point, PAIS -> pais (with SANUM/SAADDR2), the situs
  // Parcel_Data query -> rolls-situs, and the AIN fallback query -> rolls.
  function pathRouter(onSitus: () => void, onAinScan: () => void) {
    return async (url: string) => {
      let body: unknown = cams;
      if (url.includes('pais_parcels')) body = pais;
      else if (url.includes('CAMS_Locator')) body = cams;
      else if (url.includes('Parcel_Data')) {
        const d = decodeURIComponent(url);
        if (d.includes('SitusZIP5')) { onSitus(); body = rollsSitus; }
        else { onAinScan(); body = rolls; }
      }
      return { ok: true, json: async () => body } as unknown as Response;
    };
  }

  it('resolves facts via the indexed situs query (no AIN scan) on the happy path', async () => {
    let situs = false, ainScan = false;
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', pathRouter(() => (situs = true), () => (ainScan = true)));
    expect(situs).toBe(true);
    expect(ainScan).toBe(false);
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('falls back to the AIN query when our parcel is absent from the situs result', async () => {
    let ainScan = false;
    const fakeFetch = async (url: string) => {
      let body: unknown = cams;
      if (url.includes('pais_parcels')) body = pais;
      else if (url.includes('CAMS_Locator')) body = cams;
      else if (url.includes('Parcel_Data')) {
        const d = decodeURIComponent(url);
        if (d.includes('SitusZIP5')) body = { features: [] }; // situs: our parcel absent
        else { ainScan = true; body = rolls; }                // AIN fallback finds it
      }
      return { ok: true, json: async () => body } as unknown as Response;
    };
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', fakeFetch);
    expect(ainScan).toBe(true);
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });
});
```

- [ ] **Step 3: Run to verify the new/updated tests fail**

Run: `npx vitest run tests/clients/assessor.test.ts`
Expected: FAIL — `parcelAtPoint` still returns a string (`toEqual({ain,houseNo,zip})` fails) and `fetchParcel` still calls the old `fetchRolls` only.

- [ ] **Step 4: Implement `ParcelRef`, the new `parcelAtPoint`, and `fetchParcel`**

In `lib/clients/assessor.ts`:

(a) Add the `ParcelRef` interface above `parcelAtPoint`:

```ts
/** A matched parcel: its AIN plus the situs key used for the fast roll query. */
export interface ParcelRef {
  ain: string;
  houseNo: number | null;
  zip: string | null;
}
```

(b) Replace the whole `parcelAtPoint` function with:

```ts
/** Point-in-polygon: the parcel (AIN + situs) whose polygon contains this point. */
export async function parcelAtPoint(point: CamsPoint, fetchImpl: FetchLike = timeoutFetch()): Promise<ParcelRef | null> {
  const geometry = encodeURIComponent(
    JSON.stringify({ x: point.x, y: point.y, spatialReference: { wkid: point.wkid } }),
  );
  // NOTE: do not add resultRecordCount — the PAIS ArcGIS endpoint 400s on it.
  const url =
    `${PAIS}?geometry=${geometry}&geometryType=esriGeometryPoint&inSR=${point.wkid}` +
    `&spatialRel=esriSpatialRelIntersects&outFields=AIN,SANUM,SAADDR2&returnGeometry=false&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Assessor PAIS error: ${res.status}`);
  const json = await res.json();
  const ain = selectAin(json);
  if (!ain) return null;
  const attrs: Record<string, unknown> =
    (json as FeatureCollection).features?.find((f) => String(f.attributes?.AIN) === ain)?.attributes ?? {};
  return { ain, houseNo: parseHouseNo(attrs.SANUM), zip: parseZip(attrs.SAADDR2) };
}
```

(c) Replace the whole `fetchParcel` function with:

```ts
/**
 * Address → parcel facts via LA County's own stack: CAMS locator (rooftop point)
 * → PAIS parcels (point-in-polygon → AIN + situs) → assessment roll (year/units).
 * Facts come from the fast INDEXED situs query; we fall back to the AIN query when
 * situs is unavailable or our parcel is absent from the situs candidates. Returns
 * null facts at any confident-match failure instead of a wrong parcel.
 */
export async function fetchParcel(
  address: string,
  // Optional so each sub-call (CAMS / PAIS / Rolls) falls back to its own
  // timeoutFetch default; tests inject one fetch to route all of them.
  fetchImpl?: FetchLike,
): Promise<{ ain: string | null; facts: ParcelFacts }> {
  const point = await fetchCamsPoint(address, fetchImpl);
  if (!point) return { ain: null, facts: { ...EMPTY } };

  const ref = await parcelAtPoint(point, fetchImpl);
  if (!ref) return { ain: null, facts: { ...EMPTY } };

  let facts: ParcelFacts | null = null;
  if (ref.zip && ref.houseNo != null) {
    facts = await fetchRollsBySitus(ref.ain, ref.zip, ref.houseNo, fetchImpl);
  }
  if (facts == null) {
    facts = await fetchRolls(ref.ain, fetchImpl);
  }
  return { ain: ref.ain, facts };
}
```

- [ ] **Step 5: Run the full assessor test file**

Run: `npx vitest run tests/clients/assessor.test.ts`
Expected: PASS — all describe blocks (selectAin, parcelAtPoint, parseParcelFacts, fetchParcel, fetchParcel situs path, parseHouseNo, parseZip, selectFactsByAin, fetchRollsBySitus). The existing `fetchParcel` "chains" test still passes because the situs query routes to `rolls` and `selectFactsByAin` finds AIN `5425003009`.

- [ ] **Step 6: Commit**

```bash
git add lib/clients/assessor.ts tests/clients/assessor.test.ts tests/fixtures/pais.json
git commit -m "feat(assessor): situs-first fetchParcel (fast cold lookups, AIN fallback)"
```

---

## Task 4: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exit 0, no errors.

- [ ] **Step 3: Full test suite**

Run: `npm test`
Expected: all tests pass (163 prior + the new assessor tests).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: exit 0, build succeeds.

- [ ] **Step 5: Commit (only if any fix was needed in Steps 1–4)**

```bash
git add -A
git commit -m "chore: verification fixes for situs-query lookup"
```

> If Steps 1–4 were all green with no changes, skip this commit.

---

## Manual QA (Chrome, after the gate — performed by the operator, per the standing full-site-QA constraint)

1. Build and start the server on port 3005: `npm run build && npx next start -p 3005`.
2. In Chrome, load `http://localhost:3005/`, enter `1411 Murray Dr, Los Angeles`, submit.
3. **Expected:** the **RSO** result with facts (built 1931, 6 units) appears in ~1–2s — **not** the "Property records are temporarily unavailable" confirming-questions degrade. (ROLLS is intermittent; if a transient upstream error still degrades, retry — the unit tests cover the situs/fallback logic deterministically.)
4. Try a second distinct LA multi-unit address; confirm a fast, correct result.
5. Confirm the autocomplete dropdown, result card, and the EN/Español toggle still render correctly.
6. Stop the server afterward; leave the operator's port 3000 app alone.
