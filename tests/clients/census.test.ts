import { describe, it, expect } from 'vitest';
import { parseJurisdiction, fetchJurisdiction } from '@/lib/clients/census';
import la from '../fixtures/census-la.json';
import weho from '../fixtures/census-weho.json';
import nomatch from '../fixtures/census-nomatch.json';
import unincorpLa from '../fixtures/census-unincorp-la.json';
import unincorpNonLa from '../fixtures/census-unincorp-non-la.json';

describe('parseJurisdiction', () => {
  it('detects City of LA', () => {
    expect(parseJurisdiction(la)).toEqual({
      inLACity: true,
      placeName: 'Los Angeles city',
      incorporated: true,
      inLACounty: true,
    });
  });
  it('detects a non-LA city', () => {
    expect(parseJurisdiction(weho)).toEqual({
      inLACity: false,
      placeName: 'West Hollywood city',
      incorporated: true,
      inLACounty: true,
    });
  });
  it('returns null when no address match', () => {
    expect(parseJurisdiction(nomatch)).toBeNull();
  });
  it('sets inLACounty true for unincorporated LA County address', () => {
    const j = parseJurisdiction(unincorpLa);
    expect(j?.inLACounty).toBe(true);
    expect(j?.placeName).toBeNull();
    expect(j?.inLACity).toBe(false);
  });
  it('sets inLACounty undefined when county geography is absent', () => {
    // nomatch returns null — test a response with no Counties entry
    const noCounty = {
      result: {
        addressMatches: [
          {
            matchedAddress: 'SOMEWHERE',
            geographies: {
              'Incorporated Places': [{ NAME: 'Some City', GEOID: '0999999' }],
            },
          },
        ],
      },
    };
    expect(parseJurisdiction(noCounty)?.inLACounty).toBeUndefined();
  });
  it('sets inLACounty false for unincorporated non-LA County address', () => {
    const j = parseJurisdiction(unincorpNonLa);
    expect(j?.inLACounty).toBe(false);
    expect(j?.placeName).toBeNull();
  });
});

describe('fetchJurisdiction', () => {
  it('uses the injected fetch and returns parsed jurisdiction', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => la }) as unknown as Response;
    const j = await fetchJurisdiction('1411 Murray Dr, Los Angeles, CA', fakeFetch);
    expect(j?.inLACity).toBe(true);
    expect(j?.inLACounty).toBe(true);
  });
});
