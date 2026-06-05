# Legal-Review Corrections Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD (RED → GREEN → commit). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Apply the three confirmed corrections from the 2026-06-04 AI+statute legal re-verification, without weakening the tool's protective lean or fabricating any figure.

**Architecture:** Pure-function engine (`lib/rules/engine.ts`), dated legal constants (`lib/legal/constants.ts`), cap/staleness presenters (`lib/content/rights.ts`), increase checker (`lib/rules/increase.ts`), bilingual catalogs (`messages/{en,es}.json`). All figures come from dated `LEGAL` constants — never inline.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Vitest 4.

**Adjudicated (NO change):** RSO 3% ends 2026-06-30; 2026-07-01 onward = 90% CPI, floor 1% / ceiling 4%, exact % pending LAHD. App's `rsoCapPct` already correct. The "3% through 2027" claim is an uncorroborated third-party conflation.

---

## Task 1 — Issue 2: record-confirmed 2+ unit parcel can't be downgraded (highest risk)

**Files:** Modify `lib/rules/engine.ts` (both `resolveRegime` and `resolveCounty` unit blocks); `messages/en.json` + `messages/es.json` (`question.IS_SEPARATE_HOUSE.q` / `.help`); Test `tests/rules/engine.test.ts`.

- [ ] **Step 1 (RED):** Add tests: (a) City `{yearBuilt:1925, units:2, useCode:'0500'}, answers:{isSeparateHouse:true}` → `regime==='RSO'`; (b) County `{yearBuilt:1990, units:2}, answers:{isSeparateHouse:true}` → `'COUNTY_RSTPO'`; (c) repurpose the existing "asks separate-house when there are exactly 2 units" test to assert RSO + `questions` does NOT contain `IS_SEPARATE_HOUSE`.
- [ ] **Step 2:** In BOTH unit blocks, insert a record-wins branch right after the `isCondo === true` branch:
  ```ts
  } else if (facts.units != null && facts.units >= 2) {
    multiUnit = true;
    reasons.push(facts.units >= 3 ? { code: 'UNITS_COUNT', params: { count: facts.units } } : { code: 'TWO_UNITS' });
  }
  ```
  Then remove the now-dead `facts.units >= 3` / `=== 2` (with its re-ask) branches; the final `else` becomes `facts.units === 1 → SINGLE_UNIT`.
- [ ] **Step 3:** Rewrite `question.IS_SEPARATE_HOUSE.q` (parcel framing) and `.help` (ADU/back-house = "a building with other units"; protective default) in en + es.
- [ ] **Step 4 (GREEN):** `npx vitest run tests/rules/engine.test.ts` passes.
- [ ] **Step 5:** Commit.

## Task 2 — Issue 1: AB1482 exemption requires non-corporate owner

**Files:** Modify `lib/rules/engine.ts` (city `hasAb1482ExemptionNotice` yes-branch); `messages/en.json` + `es.json` (`reason.EXEMPTION_NOTICE_GIVEN`); Test `tests/rules/engine.test.ts`.

- [ ] **Step 1 (RED):** Test: `{yearBuilt:1995, units:1, useCode:'0100'}, answers:{hasAb1482ExemptionNotice:true}` → `regime==='AB1482'`, `confidence==='low'`, reasons include `EXEMPTION_NOTICE_GIVEN`.
- [ ] **Step 2:** Change yes-branch return from `JCO_ONLY`/`medium` to `AB1482`/`low` (keep the cap; lean protective because ownership can't be verified). Add explanatory comment citing Civ §1947.12(d)(5)/§1946.2(e)(8).
- [ ] **Step 3:** Rewrite `reason.EXEMPTION_NOTICE_GIVEN` (en+es): no longer "no state rent cap"; state the non-corporate-owner condition + "we still show the cap" + Just Cause + confirm with LAHD.
- [ ] **Step 4 (GREEN):** tests pass. **Step 5:** Commit.

## Task 3 — Issue 4: County pending-figure honesty

**Files:** `lib/legal/constants.ts` (rename `RsoCapPeriod`→`CapPeriod`; add County pending entry; bump `lastVerified`→2026-06-04); `lib/rules/increase.ts` (extract `rangeResult`; County null-handling); `lib/content/rights.ts` (`capLabel` County pending); `messages/{en,es}.json` (add `result.capCountyPending`; genericize `increase.verdict.{withinRange,overRange,uncertainRange}` to drop hardcoded "LAHD"); `lib/content/help.ts` (comment date); Tests `tests/rules/increase.test.ts`, `tests/content/rights.test.ts`.

- [ ] **Step 1 (RED):** increase test — `COUNTY_RSTPO` on `2026-08-01`: proposed +0% → `WITHIN_RANGE`; +5% → `OVER_RANGE`; +2% → `UNCERTAIN_RANGE` with `capCeilingPct===3`. rights test — `capLabel('COUNTY_RSTPO', t, 2026-08-01)` contains "up to 3%"; `capStaleness('COUNTY_RSTPO', 2026-08-01)?.reason === 'pending publication'`.
- [ ] **Step 2:** constants: rename interface, add `{ value:null, ceilingPct:3, effectiveFrom:'2026-07-01', source:'…', expectedUpdate:'2026-07-01', note:'…' }` to `countyCapPct`; `lastVerified:'2026-06-04'`.
- [ ] **Step 3:** increase.ts: extract `rangeResult(current, proposed, floor, ceiling, proposedPct)`; use for RSO pending (floor=floorPct) and new County pending (floor=`floorPct ?? 0`).
- [ ] **Step 4:** rights.ts `capLabel` County branch → `capCountyPending` when value null.
- [ ] **Step 5:** messages: add `result.capCountyPending`; genericize the 3 range strings (en+es). help.ts comment → 2026-06-04.
- [ ] **Step 6 (GREEN):** full suite passes. **Step 7:** Commit.

## Final gate & QA
- [ ] `npx tsc --noEmit` + `npm run lint` + `npm test` + `npm run build` all green.
- [ ] Headless QA on port 3005 (build + `/api/health` + a real lookup) — live Chrome QA + deploy deferred to when the user can grant browser permission / approve the production push (legal sign-off gate remains).
