import { LEGAL } from '@/lib/legal/constants';
import { Regime } from './types';

export type IncreaseVerdict =
  | 'WITHIN_CAP'
  | 'OVER_CAP'
  | 'WITHIN_RANGE'
  | 'OVER_RANGE'
  | 'UNCERTAIN_RANGE'
  | 'NO_CAP'
  | 'NEEDS_INPUT'
  | 'NOT_APPLICABLE';

export interface IncreaseResult {
  verdict: IncreaseVerdict;
  capPct?: number;
  capFloorPct?: number;
  capCeilingPct?: number;
  allowedMaxRent?: number;
  allowedMaxAtFloor?: number;
  allowedMaxAtCeiling?: number;
  proposedPct?: number;
}

export interface CheckIncreaseInput {
  regime: Regime;
  currentRent: number;
  proposedRent: number;
  onDate?: Date;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round1 = (x: number) => Math.round(x * 10) / 10;

export function checkIncrease({ regime, currentRent, proposedRent, onDate = new Date() }: CheckIncreaseInput): IncreaseResult {
  if (regime !== 'RSO' && regime !== 'AB1482' && regime !== 'JCO_ONLY' && regime !== 'COUNTY_RSTPO' && regime !== 'COUNTY_JCO') {
    return { verdict: 'NOT_APPLICABLE' };
  }
  if (regime === 'JCO_ONLY' || regime === 'COUNTY_JCO') return { verdict: 'NO_CAP' };
  if (!Number.isFinite(currentRent) || !Number.isFinite(proposedRent) || currentRent <= 0 || proposedRent < 0) {
    return { verdict: 'NEEDS_INPUT' };
  }

  const d = onDate.toISOString().slice(0, 10);
  // proposedPct is informational only — verdicts compare dollar amounts, not percentages.
  const proposedPct = round1(((proposedRent - currentRent) / currentRent) * 100);

  if (regime === 'RSO') {
    const period = LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!period) return { verdict: 'NOT_APPLICABLE' };

    if (period.value != null) {
      const capPct = period.value;
      const allowedMaxRent = round2(currentRent * (1 + capPct / 100));
      return {
        verdict: proposedRent <= allowedMaxRent ? 'WITHIN_CAP' : 'OVER_CAP',
        capPct,
        allowedMaxRent,
        proposedPct,
      };
    }

    // Pending RSO period: the range bounds must come from LEGAL — never invent them.
    if (!('floorPct' in period) || period.floorPct == null || period.ceilingPct == null) {
      return { verdict: 'NEEDS_INPUT' };
    }
    const floor = period.floorPct;
    const ceiling = period.ceilingPct;
    const allowedMaxAtFloor = round2(currentRent * (1 + floor / 100));
    const allowedMaxAtCeiling = round2(currentRent * (1 + ceiling / 100));
    let verdict: IncreaseVerdict;
    if (proposedRent <= allowedMaxAtFloor) verdict = 'WITHIN_RANGE';
    else if (proposedRent > allowedMaxAtCeiling) verdict = 'OVER_RANGE';
    else verdict = 'UNCERTAIN_RANGE';
    return { verdict, capFloorPct: floor, capCeilingPct: ceiling, allowedMaxAtFloor, allowedMaxAtCeiling, proposedPct };
  }

  if (regime === 'COUNTY_RSTPO') {
    const period = LEGAL.countyCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!period) return { verdict: 'NOT_APPLICABLE' };
    const capPct = period.value;
    const allowedMaxRent = round2(currentRent * (1 + capPct / 100));
    return {
      verdict: proposedRent <= allowedMaxRent ? 'WITHIN_CAP' : 'OVER_CAP',
      capPct,
      allowedMaxRent,
      proposedPct,
    };
  }

  // AB1482
  const period = LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
  if (!period) return { verdict: 'NOT_APPLICABLE' };

  const capPct = period.value;
  const allowedMaxRent = round2(currentRent * (1 + capPct / 100));
  return {
    verdict: proposedRent <= allowedMaxRent ? 'WITHIN_CAP' : 'OVER_CAP',
    capPct,
    allowedMaxRent,
    proposedPct,
  };
}
