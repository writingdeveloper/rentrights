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
  if (regime !== 'RSO' && regime !== 'AB1482' && regime !== 'JCO_ONLY') {
    return { verdict: 'NOT_APPLICABLE' };
  }
  if (regime === 'JCO_ONLY') return { verdict: 'NO_CAP' };
  if (!Number.isFinite(currentRent) || !Number.isFinite(proposedRent) || currentRent <= 0 || proposedRent < 0) {
    return { verdict: 'NEEDS_INPUT' };
  }

  const d = onDate.toISOString().slice(0, 10);
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

    const floor = period.floorPct != null ? period.floorPct : 1;
    const ceiling = period.ceilingPct != null ? period.ceilingPct : 4;
    const allowedMaxAtFloor = round2(currentRent * (1 + floor / 100));
    const allowedMaxAtCeiling = round2(currentRent * (1 + ceiling / 100));
    let verdict: IncreaseVerdict;
    if (proposedRent <= allowedMaxAtFloor) verdict = 'WITHIN_RANGE';
    else if (proposedRent > allowedMaxAtCeiling) verdict = 'OVER_RANGE';
    else verdict = 'UNCERTAIN_RANGE';
    return { verdict, capFloorPct: floor, capCeilingPct: ceiling, allowedMaxAtFloor, allowedMaxAtCeiling, proposedPct };
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
