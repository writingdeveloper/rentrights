# RentRights — Competitive Gap Analysis & Development Strategy

Date: 2026-06-11 · Based on live-web survey of comparable tools (sources at bottom).
Status: reviewed proposal — items below are NOT committed work until scheduled.

## 1. Landscape summary (what exists today)

| Tool | Operator | Method | Overlap with us | Their gap |
|---|---|---|---|---|
| TenantProtections.org | TechEquity Collaborative | zip code + user-answered quiz → protections + rent calculator (EN/ES) | Closest competitor: statewide AB1482 + 20+ local ordinances, increase calculator | **No parcel/records lookup** — renter must know year built / unit count themselves; shallow on LA specifics (JCO, County RSTPO detail, relocation $) |
| OWNT-IT! Rent Control Finder (rentcontrol.ownit.la) | SAJE + theworksLA | address/map → rent-control yes/no | Address-based RSO + County determination | **Frozen on 2018 assessor data** (self-disclosed); no AB1482, no cap %, no calculator |
| LAHD RSO Property Search / ZIMAS | City of LA (official) | address → RSO yes/no; also SMS "RSO" service | The authoritative RSO source we tell users to confirm with | RSO only; no multi-regime logic, no checker; government UX |
| LA County Rent Registry (DCBA) | LA County (official) | landlord registration portal | RSTPO jurisdiction context | Not a tenant-facing determination tool |
| Tenant Power Toolkit | Debt Collective + LATU + SAJE (+AEMP) | eviction Answer filing + rent-debt tools | Adjacent, not competing | Litigation response, not protections determination — a **complement** |

**Conclusion: no existing tool combines address → live public-records lookup →
unified 4-regime determination (RSO / AB1482 / County RSTPO / JCO) → current cap
% → increase-legality checker, bilingual.** That combination is our position.

Our defensible moats, in order:
1. **Data freshness discipline** — dated `lib/legal/constants.ts` + pending
   banners (vs OWNT-IT's 8-year-stale data). RR-4 (July-1 figure swap) IS the moat.
2. **Live parcel facts** — renters don't need to know their building's year/units.
3. **LA depth** — JCO, relocation $, County RSTPO floors/ceilings.

## 2. Development strategy

Launch gates unchanged: RR-1 (clinic legal review), RR-2 (honest launch label),
RR-4 (2026-07-01 figure swap). New work must NOT expand the legal surface
before RR-1 review completes — Phase A is deliberately additive-content only.

### Phase A — pre-launch hardening (small, this week, strengthens RR-1 story)

| # | Item | Why (from research) | Effort |
|---|---|---|---|
| A1 | Add **Ten