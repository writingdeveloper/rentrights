import { DatedValue } from './select';

export interface CapPeriod extends DatedValue<number | null> {
  floorPct?: number;
  ceilingPct?: number;
}

// Figures re-verified 2026-07-07 against primary .gov sources. LAHD
// (housing.lacity.gov/renter-protections-2) confirms the RSO 2026-07-01–2027-06-30
// increase is 3% (new 90%-of-CPI formula, band 1%–4%). LA County DCBA's official
// RSTPO bulletin (Revised 3/2/2026, "Past and Current Allowable Increases") lists the
// 2026-07-01–2027-06-30 General increase as 1.919% (Small Property 2.919% / Luxury
// 3.919%). Both replace the earlier "pending publication" placeholders — the prior
// caution about an "uncorroborated 3%" is now resolved by the primary LAHD source.
export const LEGAL = {
  lastVerified: '2026-07-07',

  // RSO eligibility: certificate of occupancy on or before Oct 1, 1978.
  rsoBuildCutoffYear: 1978,
  rsoBuildCutoffNote: 'CO on or before October 1, 1978',

  // RSO allowable annual increase (%). value=null means "pending LAHD publication".
  rsoCapPct: [
    { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD', expectedUpdate: '2026-07-01' },
    {
      // LAHD published 3% for this window (housing.lacity.gov/renter-protections-2,
      // read 2026-07-07): "the annual rent increase … effective July 1, 2026, through
      // June 30, 2027, is 3%" — the new 90%-of-CPI formula (band 1%–4%) yields 3%.
      value: 3,
      effectiveFrom: '2026-07-01',
      effectiveTo: '2027-06-30',
      source: 'LAHD',
      expectedUpdate: '2027-07-01',
      note: 'LAHD set 3% for 2026-07-01–2027-06-30 under the new 90%-of-CPI formula (band 1%–4%).',
    },
    {
      // 2027-07-01 figure not yet published — genuinely pending until LAHD sets it
      // (~July 2027) under the 90%-of-CPI formula (band 1%–4%). value:null keeps the
      // checker in its honest "cap is being updated" range state for that window.
      value: null,
      floorPct: 1,
      ceilingPct: 4,
      effectiveFrom: '2027-07-01',
      source: 'LAHD',
      expectedUpdate: '2027-07-01',
      note: 'New 90%-of-CPI formula; LAHD publishes the exact % ~July 1, 2027.',
    },
  ] as CapPeriod[],

  // AB 1482 allowable annual increase (%) for the LA metro region.
  ab1482CapPct: [
    { value: 8.0, effectiveFrom: '2025-08-01', effectiveTo: '2026-07-31', source: 'CA Civ §1947.12 / CPI', expectedUpdate: '2026-08-01' },
    { value: 8.7, effectiveFrom: '2026-08-01', effectiveTo: '2027-07-31', source: 'CA Civ §1947.12 / CPI', expectedUpdate: '2027-08-01' },
  ] as DatedValue<number>[],

  // LA County RSTPO (unincorporated areas), administered by DCBA.
  // Fully covered = 2+ units AND certificate of occupancy on or before Feb 1, 1995.
  countyBuildCutoffYear: 1995,
  countyBuildCutoffNote: 'CO on or before February 1, 1995',
  // County standard allowable annual increase (%): 60% of CPI, max 3% (small-landlord 4%, luxury 5%).
  countyCapPct: [
    { value: 1.93, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LA County DCBA RSTPO (60% of CPI, max 3%)', expectedUpdate: '2026-07-01' },
    {
      // DCBA published 1.919% for this window — official RSTPO bulletin (Revised
      // 3/2/2026), "Past and Current Allowable Increases" table: General 1.919%,
      // Small Property 2.919%, Luxury 3.919% (60% of CPI, standard cap 3%).
      value: 1.919,
      ceilingPct: 3,
      effectiveFrom: '2026-07-01',
      effectiveTo: '2027-06-30',
      source: 'LA County DCBA RSTPO (60% of CPI, max 3%)',
      expectedUpdate: '2027-07-01',
    },
    {
      // 2027-07-01 figure not yet published — genuinely pending until DCBA sets it
      // (~July 2027), 60% of CPI capped at 3%. Mirrors the RSO pending entry.
      value: null,
      ceilingPct: 3,
      effectiveFrom: '2027-07-01',
      source: 'LA County DCBA RSTPO (60% of CPI, max 3%)',
      expectedUpdate: '2027-07-01',
      note: 'DCBA publishes the exact % ~July 1, 2027.',
    },
  ] as CapPeriod[],

  // Rent-increase notice periods (CA Civ §827, amended SB1103 eff. 2025-01-01).
  notice: { smallIncreaseDays: 30, largeIncreaseDays: 90, largeThresholdPct: 10, mailExtraDays: 5 },

  // Deadline to file an Answer to an unlawful-detainer (eviction) summons:
  // 10 COURT days (excludes weekends/court holidays), CCP §1167 as amended by
  // AB 2347, eff. 2025-01-01 (was 5 calendar days). Substitute service adds 5.
  evictionAnswerCourtDays: 10,

  // Relocation assistance (LA City RSO, eff. 2025-07-01) and AB 1482.
  relocation: {
    rsoEligible: { lt3yr: 10650, gte3yr: 13950 },
    rsoQualified: { lt3yr: 22450, gte3yr: 26550 },
    ab1482Months: 1,
    source: 'LAHD relocation bulletin 2025-26',
  },
} as const;
