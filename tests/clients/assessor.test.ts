import { describe, it, expect } from 'vitest';
import { parseSitus, selectAin, parseParcelFacts, fetchParcel } from '@/lib/clients/assessor';
import pais from '../fixtures/pais.json';
import rolls from '../fixtures/rolls.json';
import rollsEmpty from '../fixtures/rolls-empty.json';

describe('parseSitus', () => {
  it('splits a canonical address into uppercased situs + city', () => {
    expect(parseSitus('1411 Murray Dr, Los Angeles, CA, 90026')).toEqual({
      situs: '1411 MURRAY DR',
      city: 'LOS ANGELES',
    });
  });
});

describe('selectAin', () => {
  it('returns the AIN of a unique in-city match', () => {
    expect(selectAin(pais, 'LOS ANGELES')).toBe('5425003009');
  });
  it('returns null when the only match is in a different city (wrong-city guard)', () => {
    expect(selectAin(pais, 'PASADENA')).toBeNull();
  });
  it('returns null when one situs maps to several parcels (ambiguous)', () => {
    const multi = {
      features: [
        { attributes: { AIN: '1', SAADDR: '11750 WILSHIRE BLVD', SAADDR2: 'LOS ANGELES CA 90025' } },
        { attributes: { AIN: '2', SAADDR: '11750 WILSHIRE BLVD', SAADDR2: 'LOS ANGELES CA 90025' } },
      ],
    };
    expect(selectAin(multi, 'LOS ANGELES')).toBeNull();
  });
  it('returns null when there are no features', () => {
    expect(selectAin({ features: [] }, 'LOS ANGELES')).toBeNull();
  });
});

describe('parseParcelFacts', () => {
  it('extracts yearBuilt/units/useCode', () => {
    expect(parseParcelFacts(rolls)).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });
  it('returns nulls when no rows', () => {
    expect(parseParcelFacts(rollsEmpty)).toEqual({ yearBuilt: null, units: null, useCode: null });
  });
});

describe('fetchParcel', () => {
  it('chains PAIS then Rolls for a unique in-city match', async () => {
    const fakeFetch = async (url: string) => {
      const body = url.includes('PAIS') ? pais : rolls;
      return { ok: true, json: async () => body } as unknown as Response;
    };
    const out = await fetchParcel('1411 MURRAY DR, LOS ANGELES, CA, 90026', fakeFetch);
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('returns null facts when no parcel matches the situs', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ features: [] }) }) as unknown as Response;
    const out = await fetchParcel('300 S SANTA FE AVE, LOS ANGELES, CA, 90013', fakeFetch);
    expect(out.ain).toBeNull();
    expect(out.facts).toEqual({ yearBuilt: null, units: null, useCode: null });
  });

  it('does not call Rolls (returns null facts) when the match is in the wrong city', async () => {
    let rollsCalled = false;
    const fakeFetch = async (url: string) => {
      if (url.includes('Parcel_Data')) rollsCalled = true;
      return { ok: true, json: async () => pais } as unknown as Response; // pais is in LOS ANGELES
    };
    const out = await fetchParcel('1411 MURRAY DR, PASADENA, CA, 91101', fakeFetch);
    expect(out.ain).toBeNull();
    expect(out.facts).toEqual({ yearBuilt: null, units: null, useCode: null });
    expect(rollsCalled).toBe(false);
  });
});
