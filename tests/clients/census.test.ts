import { describe, it, expect } from 'vitest';
import { parseJurisdiction, fetchJurisdiction } from '@/lib/clients/census';
import la from '../fixtures/census-la.json';
import weho from '../fixtures/census-weho.json';
import nomatch from '../fixtures/census-nomatch.json';

describe('parseJurisdiction', () => {
  it('detects City of LA', () => {
    expect(parseJurisdiction(la)).toEqual({ inLACity: true, placeName: 'Los Angeles city', incorporated: true });
  });
  it('detects a non-LA city', () => {
    expect(parseJurisdiction(weho)).toEqual({ inLACity: false, placeName: 'West Hollywood city', incorporated: true });
  });
  it('returns null when no address match', () => {
    expect(parseJurisdiction(nomatch)).toBeNull();
  });
});

describe('fetchJurisdiction', () => {
  it('uses the injected fetch and returns parsed jurisdiction', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => la }) as unknown as Response;
    const j = await fetchJurisdiction('1411 Murray Dr, Los Angeles, CA', fakeFetch);
    expect(j?.inLACity).toBe(true);
  });
});
