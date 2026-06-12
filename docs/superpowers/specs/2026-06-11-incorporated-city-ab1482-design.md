# RR-5 — Incorporated-city AB 1482 baseline (design)

Prepared: 2026-06-11 · Branch: `feat/incorporated-city-ab1482`

## Problem (from competitive analysis 2026-06-11)

Today `resolveRegime` returns `OUT_OF_JURISDICTION` for any address that is in an
incorporated city other than LA City (`engine.ts:22-30`), with copy "This tool
currently covers the City of LA only." But **AB 1482 is a statewide law**: a
renter in Santa Monica, West Hollywood, Long Beach, Pasadena, Glendale,
Inglewood, Culver City, etc. is still covered by AB 1482's rent cap and just-cause
protections (or a *stronger* local ordinance). The competitor TenantProtections.org
covers 20+ CA municipalities; our dead-end is our most visible coverage gap, and
we already own the entire AB 1482 engine/constants/copy.

## Decision (option (a), user-approved)

Send incorporated-city addresses through an **AB 1482 baseline** path instead of
OUT_OF_JURISDICTION. We do **not** model each city's local ordinance (YAGNI +
legal-risk). Instead we:

1. Always prepend an `INCORPORATED_CITY` reason naming the city and stating that
   AB 1482 applies as a floor while the city *may* have stronger local control —
   confirm locally.
2. Reuse the existing unit-count / SFR-exemption-notice logic, but **skip the RSO
   (Oct 1978) and the 15-year new-construction branches** — both are LA-City-only.
   Skipping new-construction-exempt means a genuinely new unit is shown the cap it
   may not strictly owe; that is the *protective* error direction (consistent with
   the engine's existing "cap-applies error is the safe direction" rule) and is
   corrected by the "confirm with your city" copy.
3. Cap confidence at **medium** for this path: the unmodeled local-ordinance
   question is an inherent uncertainty, so we never claim "high".

No new `Regime` value — we reuse `AB1482` (its rights points already cover the
statewide cap, 12-month just cause, relocation, and notice periods). One new
`ReasonCode`: `INCORPORATED_CITY`.

### Authority routing

`AB1482` currently routes the "not final — confirm with…" banner to **LAHD**
(`rights.ts:72-74`). LAHD only administers LA City. For the incorporated-city
case the banner must instead be **generic** ("your local rent/housing authority").
`notFinalBanner` gains an optional `reasons` argument; when `INCORPORATED_CITY` is
present it returns the generic copy. AB 1482 *staleness* authority stays "the
state (CPI)" — that is correct everywhere because the cap formula is statewide.

## Behavior table (incorporated city, e.g. West Hollywood)

| Facts / answers | Regime | Confidence |
|---|---|---|
| 2+ units (record or answered) | AB1482 | medium |
| SFR/condo, exemption-notice question unanswered | AB1482 | low (asks the question) |
| SFR/condo, no exemption notice | AB1482 | medium |
| SFR/condo, exemption notice given | AB1482 | low (corporate-owner caveat) |
| unit count unknown | AB1482 | low (asks IS_SEPARATE_HOUSE) |

Out-of-LA-County incorporated cities are treated identically (AB 1482 is
statewide); the get-help directory is still LA-oriented but the AB 1482 guidance
itself is accurate. Truly out-of-state / no-place addresses keep `OUTSIDE_LA`.

## Files

- `lib/rules/types.ts` — add `INCORPORATED_CITY` to `ReasonCode` + `ALL_REASON_CODES`.
- `lib/rules/engine.ts` — replace the `placeName !== null` early-return with
  `resolveIncorporatedCity(jurisdiction, facts, answers)`.
- `lib/content/rights.ts` — `notFinalBanner(regime, t, reasons?)`: generic when
  `INCORPORATED_CITY` present.
- `components/ResultCard.tsx` — pass `result.reasons` to `notFinalBanner`.
- `messages/en.json` / `messages/es.json` — add `reason.INCORPORATED_CITY`.
- Tests: update the existing WEHO "out-of-jurisdiction" case (now AB1482) and add
  incorporated-city cases in `tests/rules/engine.test.ts`; i18n coverage test
  already enforces the new reason key in both locales.

## QA (2026-06-11, local prod build, Chrome)

Verified with a real West Hollywood address (1234 N Hayworth Ave): regime AB1482
(previously OUT_OF_JURISDICTION), Low confidence asking IS_SEPARATE_HOUSE →
Medium after "a building with other units"; cap "up to 8%"; the not-final banner
and "what you can do" step both showed the generic "your city's office" copy
(NOT LAHD); the INCORPORATED_CITY reason rendered in both English and Spanish.
206 unit tests pass (was 202).

## Out of scope (deferred)

Per-city ordinance modeling (Santa Monica MAS, WeHo RSO, etc.), a dedicated
`INCORPORATED_AB1482` regime, and any change to the increase checker (AB 1482 cap
math already applies). Revisit only if a clinic review asks for city-specific
copy.
