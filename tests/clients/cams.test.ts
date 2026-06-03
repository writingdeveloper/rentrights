import { describe, it, expect } from 'vitest';
import { parseCamsPoint, fetchCamsPoint } from '@/lib/clients/cams';

const strongMatch = {
  spatialReference: { wkid: 102645 },
  candidates: [{ address: '1411 MURRAY DRIVE, LOS ANGELES, CA, 90026', score: 100, location: { x: 6478592, y: 1854140 } }],
};

describe('parseCamsPoint', () => {
  it('returns the rooftop point + wkid for a strong match', () => {
    expect(parseCamsPoint(strongMatch)).toEqual({
      x: 6478592,
      y: 1854140,
      wkid: 102645,
      score: 100,
      matchAddr: '1411 MURRAY DRIVE, LOS ANGELES, CA, 90026',
    });
  });

  it('rejects a below-threshold match (e.g. a direction substitution scoring ~91)', () => {
    const weak = { spatialReference: { wkid: 102645 }, candidates: [{ address: '2200 W 7TH ST', score: 90.87, location: { x: 1, y: 2 } }] };
    expect(parseCamsPoint(weak)).toBeNull();
  });

  it('returns null when there are no candidates', () => {
    expect(parseCamsPoint({ spatialReference: { wkid: 102645 }, candidates: [] })).toBeNull();
  });

  it('returns null when the spatial reference is missing', () => {
    expect(parseCamsPoint({ candidates: [{ score: 100, location: { x: 1, y: 2 } }] })).toBeNull();
  });
});

describe('fetchCamsPoint', () => {
  it('strips a unit designator and parses the point from the injected fetch', async () => {
    let captured = '';
    const fakeFetch = async (url: string) => {
      captured = url;
      return { ok: true, json: async () => strongMatch } as unknown as Response;
    };
    const p = await fetchCamsPoint('1411 Murray Dr #5, Los Angeles', fakeFetch);
    expect(p?.wkid).toBe(102645);
    expect(captured.toLowerCase()).not.toContain('%235'); // "#5" stripped before encoding
  });
});
