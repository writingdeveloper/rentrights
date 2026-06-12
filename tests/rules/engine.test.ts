import { describe, it, expect } from 'vitest';
import { resolveRegime } from '@/lib/rules/engine';
import { Jurisdiction } from '@/lib/rules/types';

const LA: Jurisdiction = { inLACity: true, placeName: 'Los Angeles city', incorporated: true };
const WEHO: Jurisdiction = { inLACity: false, placeName: 'West Hollywood city', incorporated: true };
const NOW = new Date('2026-06-02'); // cutoffYear = 2011

describe('resolveRegime', () => {
  it('treats an incorporated city (not LA City) as AB1482 baseline, not out-of-jurisdiction', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 1950, units: 4, useCode: '0500' } });
    expect(r.regime).toBe('AB1482');
    // Inherent local-ordinance uncertainty caps confidence at medium, never high.
    expect(r.confidence).toBe('medium');
    expect(r.reasons[0].code).toBe('INCORPORATED_CITY');
    expect(r.reasons[0].params?.placeName).toBe('West Hollywood city');
  });

  it('does NOT apply the RSO (1978) branch in an incorporated city — an old multi-unit is AB1482, not RSO', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 1925, units: 6, useCode: '0500' } });
    expect(r.regime).toBe('AB1482');
    expect(r.reasons.some((x) => x.code === 'BUILT_BEFORE_CUTOFF')).toBe(false);
  });

  it('does NOT apply the 15-year new-construction exemption in an incorporated city (protective: keeps the cap)', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 2024, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('medium');
    expect(r.reasons.some((x) => x.code === 'NEW_CONSTRUCTION_EXEMPT')).toBe(false);
  });

  it('asks the AB1482 exemption-notice question for an incorporated-city single-family home (low confidence)', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 1995, units: 1, useCode: '0100' }, now: NOW });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('low');
    expect(r.questions).toContain('AB1482_EXEMPTION_NOTICE');
  });

  it('asks IS_SEPARATE_HOUSE when the incorporated-city unit count is unknown', () => {
    const r = resolveRegime({ jurisdiction: WEHO, facts: { yearBuilt: 1990, units: null, useCode: null }, now: NOW });
    expect(r.regime).toBe('AB1482');
    expect(r.questions).toContain('IS_SEPARATE_HOUSE');
  });

  it('classifies a pre-1978 multi-unit LA building as RSO with high confidence (1411 Murray Dr)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1931, units: 6, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('high');
    expect(r.questions).toHaveLength(0);
  });

  it('classifies a post-1978 multi-unit building as AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2010, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('high');
  });

  it('asks the CO-date question when yearBuilt is exactly 1978', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1978, units: 4, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toContain('BUILT_BEFORE_OCT_1978');
  });

  it('treats a record-confirmed 2-unit parcel as multi-unit (RSO if pre-1978) without asking separate-house', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1925, units: 2, useCode: '0500' } });
    expect(r.regime).toBe('RSO');
    expect(r.questions).not.toContain('IS_SEPARATE_HOUSE');
    expect(r.reasons.some((x) => x.code === 'TWO_UNITS')).toBe(true);
  });

  it('keeps a record-confirmed 2-unit parcel in RSO even if the renter calls it a single stand-alone house (ADU/duplex guard)', () => {
    // A house + ADU, or a duplex, is 2 units on the parcel = RSO-covered (LAMC §151);
    // the renter's "stand-alone" intuition must not strip RSO from a record-confirmed parcel.
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 1925, units: 2, useCode: '0500' },
      answers: { isSeparateHouse: true },
    });
    expect(r.regime).toBe('RSO');
  });

  it('treats a single-family with no exemption answer as AB1482 (protective default), low confidence, asks exemption', () => {
    // Pending the exemption question we lean protective (cap applies) rather than
    // leading with JCO-only/"no cap".
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1995, units: 1, useCode: '0100' } });
    expect(r.regime).toBe('AB1482');
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

  it('keeps the AB1482 cap (low confidence) even when an exemption notice was given, since the exemption also requires a non-corporate owner', () => {
    // Civ §1947.12(d)(5) / §1946.2(e)(8): the SFR/condo exemption needs BOTH the
    // written notice AND a non-corporate owner. We cannot verify ownership, so we
    // lean protective (cap applies) rather than asserting "no cap."
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 1995, units: 1, useCode: '0100' },
      answers: { hasAb1482ExemptionNotice: true },
    });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('low');
    expect(r.reasons.some((x) => x.code === 'EXEMPTION_NOTICE_GIVEN')).toBe(true);
  });

  it('returns UNKNOWN and asks when parcel facts are missing', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: null, units: null, useCode: null } });
    expect(r.regime).toBe('UNKNOWN');
    expect(r.questions).toContain('BUILT_BEFORE_OCT_1978');
    expect(r.questions).toContain('IS_SEPARATE_HOUSE');
  });

  it('resolves unknown facts via answers: "not a separate house" → multi-unit (post-1978 → AB1482)', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: null, units: null, useCode: null },
      answers: { builtBeforeOct1978: false, isSeparateHouse: false, isCondo: false },
      now: NOW,
    });
    expect(r.regime).toBe('AB1482');
    expect(r.questions).toEqual([]);
    expect(r.reasons.some((x) => x.code === 'SAID_NOT_SEPARATE_HOUSE')).toBe(true);
  });

  it('resolves unknown facts via answers: pre-1978 multi-unit → RSO', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: null, units: null, useCode: null },
      answers: { builtBeforeOct1978: true, isSeparateHouse: false, isCondo: false },
    });
    expect(r.regime).toBe('RSO');
  });

  it('treats a multi-unit building built within the last 15 years as AB1482-exempt (JCO_ONLY)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2020, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.reasons.some((x) => x.code === 'NEW_CONSTRUCTION_EXEMPT')).toBe(true);
  });

  it('keeps a building older than 15 years on AB1482', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1995, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('AB1482');
  });

  it('at the exact 15-year boundary year leans AB1482 (still capped), medium confidence', () => {
    // NOW=2026 → cutoff 2011. A 2011 building is ~15 years old with an unknown CO
    // month, so we must NOT assert exemption; lean protective (cap applies).
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2011, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('AB1482');
    expect(r.confidence).toBe('medium');
  });

  it('one year inside the 15-year window is exempt (JCO_ONLY), medium confidence', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 2012, units: 8, useCode: '0500' }, now: NOW });
    expect(r.regime).toBe('JCO_ONLY');
    expect(r.confidence).toBe('medium');
  });

  it('classifies a pre-1995 multi-unit unincorporated address as COUNTY_RSTPO', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: 1990, units: 4, useCode: '0500' },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
    expect(r.reasons.some((x) => x.code === 'UNINCORPORATED_COUNTY')).toBe(true);
    expect(r.reasons.some((x) => x.code === 'COUNTY_BUILT_BEFORE_1995')).toBe(true);
  });

  it('classifies a post-1995 multi-unit unincorporated address as COUNTY_JCO', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: 2010, units: 8, useCode: '0500' },
    });
    expect(r.regime).toBe('COUNTY_JCO');
  });

  it('classifies an unincorporated single-family home as COUNTY_JCO', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: 1990, units: 1, useCode: '0100' },
    });
    expect(r.regime).toBe('COUNTY_JCO');
  });

  it('keeps a record-confirmed 2-unit County parcel in COUNTY_RSTPO even if called a single house (ADU/duplex guard)', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: 1990, units: 2, useCode: '0500' },
      answers: { isSeparateHouse: true },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
  });

  it('lowers confidence at the 1995 County cutoff', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: 1995, units: 4, useCode: '0500' },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
    expect(r.confidence).toBe('medium');
  });

  it('returns OUT_OF_JURISDICTION with OUTSIDE_LA for an unincorporated non-LA-County address', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: false },
      facts: { yearBuilt: 1990, units: 4, useCode: '0500' },
    });
    expect(r.regime).toBe('OUT_OF_JURISDICTION');
    expect(r.confidence).toBe('high');
    expect(r.reasons.some((x) => x.code === 'OUTSIDE_LA')).toBe(true);
  });

  it('asks the condo question for a multi-unit building whose use code is not clearly an apartment', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1990, units: 4, useCode: '0200' }, now: NOW });
    expect(r.questions).toContain('IS_CONDO');
  });

  it('does not ask the condo question for a clear apartment building (use code 05xx)', () => {
    const r = resolveRegime({ jurisdiction: LA, facts: { yearBuilt: 1931, units: 6, useCode: '0500' } });
    expect(r.questions).not.toContain('IS_CONDO');
  });

  it('routes a confirmed condo to the single-family/condo path (protective AB1482 pending exemption)', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 1990, units: 4, useCode: '0200' },
      answers: { isCondo: true },
      now: NOW,
    });
    expect(r.regime).toBe('AB1482');
    expect(r.questions).toContain('AB1482_EXEMPTION_NOTICE');
    expect(r.questions).not.toContain('IS_CONDO');
  });

  it('all questions unsure (LA city, no facts) → RSO medium, assumed reasons, no re-ask', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: null, units: null, useCode: null },
      answers: { unsure: ['BUILT_BEFORE_OCT_1978', 'IS_SEPARATE_HOUSE', 'IS_CONDO', 'AB1482_EXEMPTION_NOTICE'] },
    });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toEqual([]);
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('ASSUMED_BUILD_UNKNOWN');
    expect(codes).toContain('ASSUMED_MULTIUNIT');
    expect(codes).toContain('ASSUMED_NOT_CONDO');
  });

  it('single-family + exemption unsure → AB1482 medium (assumed no notice)', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 2000, units: 1, useCode: '0100' },
      answers: { unsure: ['AB1482_EXEMPTION_NOTICE'] },
    });
    expect(r.regime).toBe('AB1482');
    expect(r.questions).toEqual([]);
    expect(r.reasons.map((x) => x.code)).toContain('ASSUMED_NO_EXEMPTION');
  });

  it('County: form + condo unsure (no facts) → COUNTY_RSTPO medium', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: null, units: null, useCode: null },
      answers: { unsure: ['IS_SEPARATE_HOUSE', 'IS_CONDO'] },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toEqual([]);
    expect(r.reasons.map((x) => x.code)).toContain('ASSUMED_MULTIUNIT');
  });
});
