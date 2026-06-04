# Fast parcel facts via indexed situs query — design

- **Date:** 2026-06-04
- **Status:** Approved (design), pending implementation plan
- **Area:** `lib/clients/assessor.ts` (parcel-facts lookup); the live `/api/lookup` path
- **Related:** PR #3 (upstream-fetch timeouts + graceful degrade) — this builds on it.

## Problem & root cause (already proven)

`/api/lookup` is functionally correct but was 13–55s (intermittent). Instrumenting each
boundary showed the long pole is the **ROLLS** call in `lib/clients/assessor.ts`
(`services.arcgis.com/RmCCgQtiZLDCtblq/.../Parcel_Data_2021_Table`). That table is
indexed on `RollYear`, `UseCode`, `YearBuilt`, `SitusZIP5`, `SitusCity`, … **but not on
`AIN`** — the only field we filter by. So `where=AIN='…'` full-scans ~2.4M rows/roll-year
(13–55s). Query tuning (`resultRecordCount`/`orderBy`) does not help; the scan is the cost.

PR #3 bounded this with `timeoutFetch` + graceful degrade, so the site no longer hangs —
but a cold lookup of a slow-moment parcel still degrades to the confirming-questions path
instead of auto-detecting. This design makes the **cold path fast** so auto-detection works.

## Key discovery

The same ROLLS table is fast when queried through an **indexed** field. Measured:

- `where=AIN='…'` → 13–55s (unindexed scan)
- `where=SitusZIP5='90026' AND SitusHouseNo=1411 AND RollYear='2025'` → **0.3–1.5s**, ~10–20
  rows (every parcel with that house number in that ZIP, across different streets), and our
  parcel is among them: `AIN=5425003009 1411 MURRAY DR → YearBuilt 1931, Units 6, UseCode 0500`.

We already obtain the parcel's `AIN` from PAIS, and PAIS also returns the situs house number
(`SANUM`) and a situs line carrying the ZIP (`SAADDR2 = "LOS ANGELES CA 90026"`). So we can
query ROLLS by the indexed situs fields and then **select the exact row by the AIN we already
hold** — same authoritative data, ~20–100× faster, with no ingest, datastore, or artifact.

## Goal & success criteria

- Cold lookups of any LA City / unincorporated-LA-County parcel resolve facts in ~1–2s
  (was 13–55s), using only authoritative Assessor data.
- Accuracy never regresses: the row is chosen by exact `AIN`, identical to the AIN query.
- No new runtime dependency, datastore, build artifact, or deploy/refresh process.
- Correctness preserved for edge cases via a fallback to the existing (timeout-bounded) AIN query.

## Approach

Query ROLLS by the indexed `SitusZIP5` + `SitusHouseNo` (+ `RollYear`), then select the row
whose `AIN` equals the AIN from PAIS. Fall back to the existing `AIN=` query only when situs
is unavailable/unparseable or the AIN is absent from the situs result.

### New `fetchParcel` flow (`lib/clients/assessor.ts`)

1. `fetchCamsPoint(address)` → `{ x, y, wkid }` *(unchanged)*.
2. `parcelAtPoint(point)` → **`{ ain, houseNo, zip } | null`**. Expand the PAIS query's
   `outFields` to `AIN,SANUM,SAADDR2`. Keep the existing guard: return `null` unless exactly
   one parcel intersects (anti-ambiguity) and the AIN is a 10-digit string. Parse:
   - `houseNo`: integer parsed from `SANUM` (e.g. `"1411" → 1411`); `null` if not a clean positive integer.
   - `zip`: first 5-digit run in `SAADDR2` (e.g. `"LOS ANGELES CA 90026" → "90026"`); `null` if none.
3. **Fast path** — if `houseNo` and `zip` are both present, call
   `fetchRollsBySitus(ain, zip, houseNo)`:
   - Query `where=SitusZIP5='<zip>' AND SitusHouseNo=<houseNo> AND RollYear='<LATEST_ROLL_YEAR>'`,
     `outFields=AIN,YearBuilt,Units,UseCode`, `returnGeometry=false`, `resultRecordCount=50`.
   - `selectFactsByAin(json, ain)`: find the feature whose `AIN === ain` and parse its facts;
     return `ParcelFacts` on hit, `null` if the AIN is not in the candidate set.
4. **Fallback** — if there is no situs, or `fetchRollsBySitus` returns `null`, call the existing
   `fetchRolls(ain)` (unchanged `AIN=` query). This is the bounded-slow path; worst case is
   today's behavior (degrade on timeout). Correctness is never lost.

### Functions

| Function | Change |
| --- | --- |
| `parcelAtPoint(point, fetchImpl?)` | returns `{ ain, houseNo, zip } | null` (was `string | null`); expands `outFields`; parses situs |
| `selectAin(json)` | unchanged — single-parcel + 10-digit AIN guard (situs is parsed in `parcelAtPoint` from the same single matching feature) |
| `selectFactsByAin(json, ain)` | **new** — pick the feature matching `ain`, parse its facts, or `null` |
| `fetchRollsBySitus(ain, zip, houseNo, fetchImpl?)` | **new** — indexed query + `selectFactsByAin`; returns `ParcelFacts | null`; throws on HTTP error |
| `fetchRolls(ain, fetchImpl?)` | unchanged — the AIN-query fallback |
| `parseParcelFacts(json)` | unchanged — reused to parse a single feature's attributes |
| `fetchParcel(address, fetchImpl?)` | orchestrates situs-first with AIN fallback |

All upstream calls keep the `timeoutFetch()` default from PR #3.

## Error handling & degrade

- HTTP non-200 on any upstream → throw (existing pattern) → caught in `lookup()` → `RECORDS_UNAVAILABLE` → confirming-questions degrade.
- `fetchRollsBySitus` returning `null` (AIN not in situs candidates) is **not** an error — it triggers the AIN fallback.
- Timeouts (PR #3) still bound every call; a slow fallback degrades gracefully rather than hanging.

## Edge cases

- **House number repeats across streets in a ZIP** → resolved by exact AIN select (verified: 20 "1411" parcels, we pick ours).
- **`SANUM` non-numeric / fractional / ranged** (`"1411 1/2"`, `"1411-15"`) → `houseNo = null` (or integer part); on miss, AIN fallback covers it.
- **`SAADDR2` has no 5-digit ZIP** → `zip = null` → AIN fallback.
- **Parcel's ROLLS `SitusZIP5` ≠ PAIS-parsed ZIP** → AIN absent from situs result → AIN fallback.
- **No parcel / ambiguous parcel** → `parcelAtPoint` returns `null` → `fetchParcel` returns null facts (unchanged; engine asks questions).

## Testing (vitest, injected fetch + fixtures)

- `parcelAtPoint` extracts `{ ain, houseNo, zip }` from a PAIS fixture with `SANUM`/`SAADDR2`,
  and asserts the query requests the situs `outFields`.
- `selectFactsByAin` picks the correct row among multiple same-house-number candidates and
  returns `null` when the AIN is absent.
- `fetchRollsBySitus` builds the indexed `where` (asserts `SitusZIP5`/`SitusHouseNo`/`RollYear`,
  and **no** `AIN=` scan) and returns the selected facts.
- `fetchParcel` happy path resolves facts via the situs query; a second test forces the
  fallback (AIN absent from situs result) and asserts the AIN query is used.
- Update the existing `fetchParcel` router test: PAIS fixture gains `SANUM`/`SAADDR2`; the
  router answers the situs query URL.
- Full suite + `tsc` + `lint` + `build` stay green.

## QA (Chrome, per the standing full-site constraint)

- Cold lookup of `1411 Murray Dr, Los Angeles` returns the RSO result with facts (1931 / 6
  units) in ~1–2s — **no** "records temporarily unavailable" degrade.
- A second distinct LA address (e.g. a known multi-unit building) resolves quickly and correctly.
- Autocomplete dropdown, result card, and Español toggle still render correctly.

## Out of scope / follow-ups

- The `RollYear='2025'` assumption (post-publication currency) is unchanged and tracked separately.
- No data ingest / local index (explicitly rejected in favor of this lighter design).
- Deploy-time concerns (rate limiting, Docker) remain in the M3-C track.

## Verification gate

`npx tsc --noEmit` = 0 · `npm run lint` = 0 · `npm test` green · `npm run build` = 0 · CI green on the PR · Chrome QA confirms the fast cold path.
