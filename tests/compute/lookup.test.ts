import { describe, it, expect } from 'vitest';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { Jurisdiction, ParcelFacts } from '@/lib/rules/types';

const deps = (j: Jurisdiction | null, facts: ParcelFacts) => ({
  getJurisdiction: async () => j,
  getParcel: async () => ({ ain: '1', facts }),
});

describe('lookup', () => {
  it('returns an RSO result for a pre-1978 multi-unit LA address', async () => {
    const res = await lookup(
      '1411 Murray Dr',
      {},
      deps(
        { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
        { yearBuilt: 1931, units: 6, useCode: '0500' },
      ),
    );
    expect(res.result.regime).toBe('RSO');
    expect(res.facts.units).toBe(6);
  });

  it('throws AddressNotFoundError when the geocoder finds nothing', async () => {
    await expect(
      lookup('nowhere', {}, deps(null, { yearBuilt: null, units: null, useCode: null })),
    ).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it('adds a data warning when parcel facts are missing', async () => {
    const res = await lookup(
      'x',
      {},
      deps(
        { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
        { yearBuilt: null, units: null, useCode: null },
      ),
    );
    expect(res.dataWarnings.length).toBeGreaterThan(0);
  });

  it('applies the AB1482 15-year new-construction exemption through lookup', async () => {
    const res = await lookup('x', {}, deps(
      { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
      { yearBuilt: 2020, units: 8, useCode: '0500' },
    ), new Date('2026-06-02'));
    expect(res.result.regime).toBe('JCO_ONLY');
  });
});
