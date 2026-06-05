import { DatedValue } from './select';

export interface CapPeriod extends DatedValue<number | null> {
  floorPct?: number;
  ceilingPct?: number;
}

// All figures re-verified 2026-06-04 against LAHD / CA Civil Code / LA County DCBA —
// see docs/superpowers/plans/2026-06-04-rentrights-legal-corrections.md. The RSO
// 2026-07-01 figure stays pending (new 90%-of-CPI formula, floor 1% / ceiling 4%);
// "3% through 2027" is an uncorroborated third-party conflation and is NOT adopted.
export const LEGAL = {
  lastVerified: '2026-06-04',

  // RSO eligibility: certificate of occupancy on or before Oct 1, 1978.
  rsoBuildCutoffYear: 1978,
  rsoBuildCutoffNote: 'CO on or before October 1, 1978',

  // RSO allowable annual increase (%). value=null means "pending LAHD publication".
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
      // Pending: DCBA publishes the 2026-07-01 figure (60% of CPI, capped at 3%)
      // ~July 1. No published floor for the County formula → treated as 0% by the
      // increase checker (ceiling-only range), mirroring the RSO pending entry.
      value: null,
      ceilingPct: 3,
      effectiveFrom: '2026-07-01',
      source: 'LA County DCBA RSTPO (60% of CPI, max 3%)',
      expectedUpdate: '2026-07-01',
      note: 'DCBA publishes the exact % ~July 1.',
    },
  ] as CapPeriod[],

  // Rent-increase notice periods (CA Civ §827, amended SB1103 eff. 2025-01-01).
  notice: { smallIncreaseDays: 30, largeIncreaseDays: 90, largeThresholdPct: 10, mailExtraDays: 5 },

  // Relocation assistance (LA City RSO, eff. 2025-07-01) and AB 1482.
  relocation: {
    rsoEligible: { lt3yr: 10650, gte3yr: 13950 },
    rsoQualified: { lt3yr: 22450, gte3yr: 26550 },
    ab1482Months: 1,
    source: 'LAHD relocation bulletin 2025-26',
  },
} as const;
