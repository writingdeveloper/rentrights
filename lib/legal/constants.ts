import { DatedValue } from './select';

export interface RsoCapPeriod extends DatedValue<number | null> {
  floorPct?: number;
  ceilingPct?: number;
}

// All figures verified 2026-06-02 against LAHD / CA Civil Code — see
// docs/superpowers/specs/2026-06-02-rentrights-design.md §7.
export const LEGAL = {
  lastVerified: '2026-06-02',

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
  ] as RsoCapPeriod[],

  // AB 1482 allowable annual increase (%) for the LA metro region.
  ab1482CapPct: [
    { value: 8.0, effectiveFrom: '2025-08-01', effectiveTo: '2026-07-31', source: 'CA Civ §1947.12 / CPI', expectedUpdate: '2026-08-01' },
    { value: 8.7, effectiveFrom: '2026-08-01', effectiveTo: '2027-07-31', source: 'CA Civ §1947.12 / CPI', expectedUpdate: '2027-08-01' },
  ] as DatedValue<number>[],

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
