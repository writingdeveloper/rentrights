import { describe, it, expect } from 'vitest';
import { resolveRegime } from '@/lib/rules/engine';
import { Jurisdiction } from '@/lib/rules/types';

const LA: Jurisdiction = { inLACity: true, placeName: 'Los Angeles city', incorporated: true };
const WEHO: Jurisdiction = { inLACity: false, placeName: 'West Hollywood city', incorporated: true };

describe('resolveRegime', () => {
  it('flags out-of-jurisdiction addresses', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 1950, units: 4, useCode: '0500' } });
    expect(r.regime).toBe('OUT_OF_JURISDICTION');
    expect(r.confidence).toBe('high');
  });

  it('classifies a pre-1978 multi-unit LA building as RSO with high confidence (1411 Murray Dr)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1931, units: 6, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('high');
    expect(r.questions).toHaveLength(0);
  });

  it('classifies a post-1978 multi-unit building as AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2010, units: 8, useCode: '0500' } });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('high');
  });

  it('asks the CO-date question when yearBuilt is exactly 1978', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1978, units: 4, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toContain('BUILT_BEFORE_OCT_1978');
  });

  it('asks separate-house when there are exactly 2 units', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1925, units: 2, useCode: '0500' } });
    expect(r.questions).toContain('IS_SEPARATE_HOUSE');
  });

  it('treats a single-family with no exemption answer as JCO-only, low confidence, asks exemption', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1995, units: 1, useCode: '0100' } });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.confidence).toBe('low');
    expect(r.questions).toContain('AB1482_EXEMPTION_NOTICE');
  });

  it('applies AB1482 to a single-family when landlord gave no exemption notice', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 1995, units: 1, useCode: '0100' },
      answers: { hasAb1482ExemptionNotice: false },
    });
    expect(r.regime).toBe('AB1482');
  });

  it('returns UNKNOWN and asks when parcel facts are missing', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: null, units: null, useCode: null } });
    expect(r.regime).toBe('UNKNOWN');
    expect(r.questions).toContain('BUILT_BEFORE_OCT_1978');
    expect(r.questions).toContain('IS_SEPARATE_HOUSE');
  });
});
