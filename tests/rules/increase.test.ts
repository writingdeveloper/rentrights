import { describe, it, expect } from 'vitest';
import { checkIncrease } from '@/lib/rules/increase';

const NOW = new Date('2026-06-02'); // RSO 3%, AB1482 8.0%
const PENDING = new Date('2026-08-01'); // RSO new-formula (value null, floor 1 / ceiling 4)

describe('checkIncrease', () => {
  it('RSO 3%: within cap', () => {
    const r = checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2050, onDate: NOW });
    expect(r.verdict).toBe('WITHIN_CAP');
    expect(r.capPct).toBe(3);
    expect(r.allowedMaxRent).toBe(2060);
  });

  it('RSO 3%: over cap', () => {
    const r = checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2200, onDate: NOW });
    expect(r.verdict).toBe('OVER_CAP');
    expect(r.allowedMaxRent).toBe(2060);
  });

  it('AB1482 8%: within and over', () => {
    expect(checkIncrease({ regime: 'AB1482', currentRent: 2000, proposedRent: 2100, onDate: NOW }).verdict).toBe('WITHIN_CAP');
    const over = checkIncrease({ regime: 'AB1482', currentRent: 2000, proposedRent: 2300, onDate: NOW });
    expect(over.verdict).toBe('OVER_CAP');
    expect(over.allowedMaxRent).toBe(2160);
  });

  it('RSO pending range: within / over / uncertain', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2010, onDate: PENDING }).verdict).toBe('WITHIN_RANGE');
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2100, onDate: PENDING }).verdict).toBe('OVER_RANGE');
    const u = checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2050, onDate: PENDING });
    expect(u.verdict).toBe('UNCERTAIN_RANGE');
    expect(u.allowedMaxAtFloor).toBe(2020);
    expect(u.allowedMaxAtCeiling).toBe(2080);
  });

  it('JCO_ONLY: no cap', () => {
    expect(checkIncrease({ regime: 'JCO_ONLY', currentRent: 2000, proposedRent: 9999, onDate: NOW }).verdict).toBe('NO_CAP');
  });

  it('out of jurisdiction / unknown: not applicable', () => {
    expect(checkIncrease({ regime: 'OUT_OF_JURISDICTION', currentRent: 2000, proposedRent: 2100, onDate: NOW }).verdict).toBe('NOT_APPLICABLE');
    expect(checkIncrease({ regime: 'UNKNOWN', currentRent: 2000, proposedRent: 2100, onDate: NOW }).verdict).toBe('NOT_APPLICABLE');
  });

  it('invalid input: needs input', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 0, proposedRent: 2100, onDate: NOW }).verdict).toBe('NEEDS_INPUT');
    expect(checkIncrease({ regime: 'RSO', currentRent: NaN, proposedRent: 2100, onDate: NOW }).verdict).toBe('NEEDS_INPUT');
  });

  it('computes the proposed increase percentage', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2200, onDate: NOW }).proposedPct).toBe(10);
  });

  it('treats a proposal exactly at the cap as within (inclusive boundary)', () => {
    expect(checkIncrease({ regime: 'RSO', currentRent: 2000, proposedRent: 2060, onDate: NOW }).verdict).toBe('WITHIN_CAP');
  });

  it('handles non-round rents without a cent misclassification', () => {
    // 1933.33 * 1.03 = 1991.3299 -> round2 1991.33
    expect(checkIncrease({ regime: 'RSO', currentRent: 1933.33, proposedRent: 1991.33, onDate: NOW }).verdict).toBe('WITHIN_CAP');
    expect(checkIncrease({ regime: 'RSO', currentRent: 1933.33, proposedRent: 1991.34, onDate: NOW }).verdict).toBe('OVER_CAP');
  });

  it('COUNTY_RSTPO 1.93%: within and over', () => {
    expect(checkIncrease({ regime: 'COUNTY_RSTPO', currentRent: 2000, proposedRent: 2030, onDate: NOW }).verdict).toBe('WITHIN_CAP');
    const over = checkIncrease({ regime: 'COUNTY_RSTPO', currentRent: 2000, proposedRent: 2100, onDate: NOW });
    expect(over.verdict).toBe('OVER_CAP');
    expect(over.capPct).toBe(1.93);
  });

  it('COUNTY_JCO: no cap', () => {
    expect(checkIncrease({ regime: 'COUNTY_JCO', currentRent: 2000, proposedRent: 9999, onDate: NOW }).verdict).toBe('NO_CAP');
  });
});
