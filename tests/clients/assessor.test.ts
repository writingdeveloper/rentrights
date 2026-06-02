import { describe, it, expect } from 'vitest';
import { parseAin, parseParcelFacts, fetchParcel } from '@/lib/clients/assessor';
import pais from '../fixtures/pais.json';
import rolls from '../fixtures/rolls.json';
import rollsEmpty from '../fixtures/rolls-empty.json';

describe('parseAin', () => {
  it('extracts the AIN', () => {
    expect(parseAin(pais)).toBe('5425003009');
  });
  it('returns null when no features', () => {
    expect(parseAin({ features: [] })).toBeNull();
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
  it('chains PAIS then Rolls using injected fetch', async () => {
    const fakeFetch = async (url: string) => {
      const body = url.includes('PAIS') ? pais : rolls;
      return { ok: true, json: async () => body } as unknown as Response;
    };
    const out = await fetchParcel('1411 Murray Dr', fakeFetch);
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('returns null facts when address has no parcel', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ features: [] }) }) as unknown as Response;
    const out = await fetchParcel('nowhere', fakeFetch);
    expect(out.ain).toBeNull();
    expect(out.facts).toEqual({ yearBuilt: null, units: null, useCode: null });
  });
});
