import { describe, it, expect, vi } from 'vitest';
import { parseCamsPoint, fetchCamsPoint, parseSuggestions, fetchSuggestions, shouldSuggest } from '@/lib/clients/cams';

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

describe('parseSuggestions', () => {
  it('extracts the suggestion text labels (capped at 5)', () => {
    const json = { suggestions: [{ text: 'A, Los Angeles, CA' }, { text: 'B, Long Beach, CA' }] };
    expect(parseSuggestions(json)).toEqual(['A, Los Angeles, CA', 'B, Long Beach, CA']);
  });
  it('returns [] on error or malformed payloads', () => {
    expect(parseSuggestions({ error: { code: 400 } })).toEqual([]);
    expect(parseSuggestions({})).toEqual([]);
    expect(parseSuggestions(null)).toEqual([]);
  });
});

describe('shouldSuggest', () => {
  it('requires at least 4 non-space characters', () => {
    expect(shouldSuggest('300')).toBe(false);
    expect(shouldSuggest('   abc ')).toBe(false);
    expect(shouldSuggest('3000')).toBe(true);
  });
});

describe('fetchSuggestions', () => {
  it('returns [] for a short query without calling fetch', async () => {
    const f = vi.fn();
    expect(await fetchSuggestions('300', f as unknown as typeof fetch)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it('queries CAMS /suggest and returns the labels', async () => {
    let url = '';
    const f = async (u: string) => {
      url = u;
      return { ok: true, json: async () => ({ suggestions: [{ text: 'X, Los Angeles, CA' }] }) } as unknown as Response;
    };
    expect(await fetchSuggestions('300 s santa fe', f)).toEqual(['X, Los Angeles, CA']);
    expect(url).toContain('/suggest?text=');
    expect(url).toContain('maxSuggestions=5');
  });
});
