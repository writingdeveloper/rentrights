# RentRights — Legal Review Packet (for pro-bono / clinic review)

Prepared: 2026-06-10 · Live site: https://rentrights.soursea.io · Source: https://github.com/writingdeveloper/rentrights
Contact: Si Hyeong Lee ([add your contact email])

## 1. What RentRights is (and is not)

RentRights is a free, open-source, bilingual (English/Spanish) web tool. A renter
enters a Los Angeles street address; the tool checks public records (LA County
Assessor parcel data via the CAMS geocoder, U.S. Census geocoder for
jurisdiction) and **estimates** which rent-law regime likely applies:

- City of LA **RSO** (LAMC ch. XV, art. 1 — §151 et seq.)
- California **AB 1482** / Tenant Protection Act (Civ. Code §§1946.2, 1947.12)
- LA County **RSTPO** (County Code ch. 8.52, unincorporated areas)
- City of LA **JCO** just-cause-only (LAMC §165.03)

It then shows the current annual increase cap, a rent-increase checker, key
protections (just cause, relocation, notice periods), and a directory of free
legal-aid organizations.

**Positioning (deliberate, JustFix-style):** every result is labeled an
*estimate*; the disclaimer states the tool provides "general information about
LA rent law, **not legal advice** about your specific situation," tells users to
confirm with LAHD/DCBA or legal aid before acting, and dates every legal figure.
Nothing is stored; no accounts.

**What we are asking you to review:** §3 (figures + citations), §4 (the riskiest
copy decisions), and §5 (open questions we could not resolve without an
attorney). We are NOT asking for representation or a formal opinion — a
read-through and corrections at whatever depth you can offer.

## 2. How figures are managed

All legal figures live in one dated file (`lib/legal/constants.ts`), each with
`source`, `effectiveFrom/To`, and `expectedUpdate`. When a figure's period
lapses before we re-verify, the UI automatically shows a "pending publication /
confirm with LAHD (or the state)" banner instead of a stale number. Figures were
last re-verified **2026-06-04** against LAHD, the Civil Code, and DCBA pages.

## 3. The figures as shipped (please confirm or correct)

| Figure | Value shown | Effective window | Cited basis |
|---|---|---|---|
| RSO eligibility | CO on or before **Oct 1, 1978** | — | LAMC §151.02 (rental units definition) |
| RSO annual cap | **3%** | 2025-07-01 → 2026-06-30 | LAHD (2026 RSO amendment, eff. Jan/Feb 2026) |
| RSO cap from 2026-07-01 | **pending** — shown as range 1%–4% ("90% of CPI, floor 1% / ceiling 4%; LAHD publishes ~July 1") | 2026-07-01 → | 2026 RSO ordinance |
| AB 1482 cap (LA metro) | **8.0%** | 2025-08-01 → 2026-07-31 | Civ. §1947.12 (5% + regional CPI, max 10%) |
| AB 1482 cap (next period) | **8.7%** | 2026-08-01 → 2027-07-31 | Civ. §1947.12 / published CPI |
| County RSTPO eligibility | 2+ units AND CO on or before **Feb 1, 1995** | — | County Code §8.52 |
| County RSTPO cap | **1.93%** | 2025-07-01 → 2026-06-30 | DCBA (60% of CPI, max 3%) |
| County cap from 2026-07-01 | **pending** — "up to 3% (DCBA publishes the exact figure)" | 2026-07-01 → | DCBA formula |
| Notice periods | 30 days (≤10%), 90 days (>10%), +5 days if mailed | current | Civ. §827 (as amended by SB 1103, eff. 2025-01-01) |
| RSO relocation (eligible tenants) | $10,650 (<3 yrs) / $13,950 (≥3 yrs) | 2025-07-01 → | LAHD relocation bulletin 2025-26 |
| RSO relocation (qualified tenants) | $22,450 (<3 yrs) / $26,550 (≥3 yrs) | 2025-07-01 → | LAHD relocation bulletin 2025-26 |
| AB 1482 relocation | 1 month's rent (no-fault) | current | Civ. §1946.2(d) |

Note: we deliberately did **not** adopt the "RSO 3% through 2027" claim that
appears on some third-party sites — our reading of the 2026 RSO amendment is
that the fixed 3% ends 2026-06-30 and the 90%-of-CPI (1%–4%) formula starts
2026-07-01. **Please flag if that reading is wrong.**

## 4. Copy decisions we most want eyes on (the 2026-06-04 self-review corrections)

1. **AB 1482 exemption-notice question.** If the user says their landlord gave
   the written single-family/condo exemption notice, we now classify the unit as
   AB1482-regime with LOW confidence and copy that says the exemption only holds
   if the owner is **not** a corporation/REIT/LLC-with-corporate-member — we no
   longer assert a flat "no state rent cap." Is the hedged framing accurate and
   adequately cautious?
2. **ADU / back-house counting.** Our unit-count question now treats an ADU,
   casita, or back house as "a building with other units" (multi-unit), since
   exempting them as "a single house" would wrongly strip protections. And when
   parcel records confirm 2+ units we no longer let a user's "it's a separate
   house" answer downgrade the estimate. Reasonable?
3. **Increase checker verdicts.** Wording is now agency-generic ("confirm with
   your local rent/housing authority") with LAHD/DCBA named only when the regime
   is known. For pending periods we show a ceiling-only range (e.g. "up to 4%")
   rather than a number.

## 5. Open questions (we know these need a lawyer)

1. When a valid AB 1482 exemption notice exists for a single-family home with a
   qualifying individual owner, is it accurate to tell a renter "no *statewide*
   cap applies, but JCO/other local rules may still apply" — or is even that too
   strong/weak for a lay audience?
2. Owner-occupied duplexes: Civ. §1946.2(e)(6) exempts them from just cause —
   should our duplex flow ask about owner occupancy, or is the current
   conservative treatment (we don't exempt) acceptable as an estimate?
3. Is the get-help directory (LAHD, DCBA, Stay Housed LA, SAJE, LAFLA, CES,
   Inner City Law Center, NLSLA — names/phones in §6 of the site) appropriate
   to list, and is any organization missing or mischaracterized?
4. UPL check: does anything in the result page (esp. the increase checker
   verdicts: "Over the legal cap — the most they can legally charge is about
   $X") cross from information into advice in your view? We can soften further.

## 6. How to review

- Live: https://rentrights.soursea.io (English/Español toggle, no sign-up).
- Copy: `messages/en.json` / `messages/es.json` in the repo hold every string.
- Figures: `lib/legal/constants.ts`.
- 200 automated tests lock the legal-critical copy (e.g. the exemption-notice
  reason must mention the corporate-owner condition; the disclaimer must say
  "not legal advice... specific situation").
