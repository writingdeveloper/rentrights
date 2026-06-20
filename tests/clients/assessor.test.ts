import { describe, it, expect } from 'vitest';
import {
  selectAin,
  parseParcelFacts,
  parcelAtPoint,
  fetchParcel,
  parseHouseNo,
  parseZip,
  selectFactsByAin,
  fetchRollsBySitus,
} from '@/lib/clients/assessor';
import pais from '../fixtures/pais.json';
import rolls from '../fixtures/rolls.json';
import rollsEmpty from '../fixtures/rolls-empty.json';
import rollsSitus from '../fixtures/rolls-situs.json';

const POINT = { x: 6478592, y: 1854140, wkid: 102645, score: 100, matchAddr: '1411 MURRAY DR' };

const cams = {
  spatialReference: { wkid: 102645 },
  candidates: [{ address: '1411 MURRAY DR', score: 100, location: { x: 6478592, y: 1854140 } }],
};
const camsWeak = { spatialReference: { wkid: 102645 }, candidates: [{ address: 'x', score: 60, location: { x: 1, y: 2 } }] };

// Route an injected fetch to the right canned response by URL.
function router(paisBody: unknown) {
  return async (url: string) => {
    let body: unknown = cams;
    if (url.includes('pais_parcels')) body = paisBody;
    else if (url.includes('Parcel_Data')) body = rolls;
    else if (url.includes('CAMS_Locator')) body = cams;
    return { ok: true, json: async () => body } as unknown as Response;
  };
}

describe('selectAin', () => {
  it('returns the AIN when the point intersects exactly one parcel', () => {
    expect(selectAin(pais)).toBe('5425003009');
  });
  it('returns null when the point intersects several parcels (ambiguous)', () => {
    const multi = { features: [{ attributes: { AIN: '1' } }, { attributes: { AIN: '2' } }] };
    expect(selectAin(multi)).toBeNull();
  });
  it('returns null when the point is in no parcel (right-of-way)', () => {
    expect(selectAin({ features: [] })).toBeNull();
  });
  it('rejects an AIN that is not exactly 10 digits (injection / malformed guard)', () => {
    expect(selectAin({ features: [{ attributes: { AIN: "5425003009' OR 1=1 --" } }] })).toBeNull();
    expect(selectAin({ features: [{ attributes: { AIN: '12345' } }] })).toBeNull();
  });
});

describe('parcelAtPoint', () => {
  it('queries PAIS with the point and returns the AIN + situs (house no, zip)', async () => {
    let captured = '';
    const fakeFetch = async (url: string) => {
      captured = url;
      return { ok: true, json: async () => pais } as unknown as Response;
    };
    expect(await parcelAtPoint(POINT, fakeFetch)).toEqual({ ain: '5425003009', houseNo: 1411, zip: '90026' });
    expect(captured).toContain('esriGeometryPoint');
    expect(captured).toContain('inSR=102645');
    expect(captured).toContain('SANUM'); // situs fields requested
    expect(captured).not.toContain('resultRecordCount'); // 400s on the PAIS endpoint
  });

  it('returns null when the point matches no single parcel', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ features: [] }) }) as unknown as Response;
    expect(await parcelAtPoint(POINT, fakeFetch)).toBeNull();
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
  it('chains CAMS → PAIS → Rolls for a confident unique match', async () => {
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', router(pais));
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('returns null facts when CAMS has no confident match', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => camsWeak }) as unknown as Response;
    const out = await fetchParcel('nowhere', fakeFetch);
    expect(out.ain).toBeNull();
    expect(out.facts).toEqual({ yearBuilt: null, units: null, useCode: null });
  });

  it('returns null facts when the point matches no single parcel', async () => {
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', router({ features: [] }));
    expect(out.ain).toBeNull();
    expect(out.facts).toEqual({ yearBuilt: null, units: null, useCode: null });
  });
});

describe('parseHouseNo', () => {
  it('parses a clean house number to a positive integer', () => {
    expect(parseHouseNo('1411')).toBe(1411);
  });
  it('returns null for fractional / ranged / empty / missing', () => {
    expect(parseHouseNo('1411 1/2')).toBeNull();
    expect(parseHouseNo('1411-15')).toBeNull();
    expect(parseHouseNo('')).toBeNull();
    expect(parseHouseNo(undefined)).toBeNull();
  });
});

describe('parseZip', () => {
  it('extracts the 5-digit zip from a situs line', () => {
    expect(parseZip('LOS ANGELES CA 90026')).toBe('90026');
  });
  it('returns null when there is no 5-digit zip', () => {
    expect(parseZip('LOS ANGELES CA')).toBeNull();
    expect(parseZip(undefined)).toBeNull();
  });
});

describe('selectFactsByAin', () => {
  const multi = {
    features: [
      { attributes: { AIN: '5424024020', YearBuilt: '1910', Units: 5, UseCode: '0500' } },
      { attributes: { AIN: '5425003009', YearBuilt: '1931', Units: 6, UseCode: '0500' } },
    ],
  };
  it('parses the facts of the row whose AIN matches', () => {
    expect(selectFactsByAin(multi, '5425003009')).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });
  it('returns null when the AIN is not among the candidates', () => {
    expect(selectFactsByAin(multi, '9999999999')).toBeNull();
  });
});

describe('fetchRollsBySitus', () => {
  it('queries the indexed situs fields (no AIN scan) and selects our parcel by AIN', async () => {
    let url = '';
    const fakeFetch = async (u: string) => {
      url = u;
      return { ok: true, json: async () => rollsSitus } as unknown as Response;
    };
    const facts = await fetchRollsBySitus('5425003009', '90026', 1411, fakeFetch);
    expect(facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("SitusZIP5='90026'");
    expect(decoded).toContain('SitusHouseNo=1411');
    expect(decoded).toContain("RollYear='2025'");
    expect(decoded).not.toContain('AIN='); // must not fall back to the unindexed scan
  });

  it('returns null when our AIN is not among the candidates (so fetchParcel can fall back)', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => rollsSitus }) as unknown as Response;
    expect(await fetchRollsBySitus('9999999999', '90026', 1411, fakeFetch)).toBeNull();
  });
});

describe('fetchParcel (situs path)', () => {
  // Route by URL: CAMS -> point, PAIS -> pais (with SANUM/SAADDR2), the situs
  // Parcel_Data query -> rolls-situs, and the AIN fallback query -> rolls.
  function pathRouter(onSitus: () => void, onAinScan: () => void) {
    return async (url: string) => {
      let body: unknown = cams;
      if (url.includes('pais_parcels')) body = pais;
      else if (url.includes('CAMS_Locator')) body = cams;
      else if (url.includes('Parcel_Data')) {
        const d = decodeURIComponent(url);
        if (d.includes('SitusZIP5')) { onSitus(); body = rollsSitus; }
        else { onAinScan(); body = rolls; }
      }
      return { ok: true, json: async () => body } as unknown as Response;
    };
  }

  it('resolves facts via the indexed situs query (no AIN scan) on the happy path', async () => {
    let situs = false, ainScan = false;
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', pathRouter(() => (situs = true), () => (ainScan = true)));
    expect(situs).toBe(true);
    expect(ainScan).toBe(false);
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('falls back to the AIN query when our parcel is absent from the situs result', async () => {
    let ainScan = false;
    const fakeFetch = async (url: string) => {
      let body: unknown = cams;
      if (url.includes('pais_parcels')) body = pais;
      else if (url.includes('CAMS_Locator')) body = cams;
      else if (url.includes('Parcel_Data')) {
        const d = decodeURIComponent(url);
        if (d.includes('SitusZIP5')) body = { features: [] }; // situs: our parcel absent
        else { ainScan = true; body = rolls; }                // AIN fallback finds it
      }
      return { ok: true, json: async () => body } as unknown as Response;
    };
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', fakeFetch);
    expect(ainScan).toBe(true);
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });

  it('falls back to the AIN query when fetchRollsBySitus THROWS (e.g. AbortError/timeout)', async () => {
    // Simulates a 12s upstream timeout on the situs path — the AIN fallback must
    // still be tried and its result returned (P2 fix: situs call wrapped in try/catch).
    let ainCalled = false;
    const fakeFetch = async (url: string) => {
      if (url.includes('CAMS_Locator')) return { ok: true, json: async () => cams } as unknown as Response;
      if (url.includes('pais_parcels')) return { ok: true, json: async () => pais } as unknown as Response;
      if (url.includes('Parcel_Data')) {
        const d = decodeURIComponent(url);
        if (d.includes('SitusZIP5')) {
          throw Object.assign(new Error('AbortError'), { name: 'AbortError' });
        }
        ainCalled = true;
        return { ok: true, json: async () => rolls } as unknown as Response;
      }
      return { ok: true, json: async () => cams } as unknown as Response;
    };
    const out = await fetchParcel('1411 Murray Dr, Los Angeles', fakeFetch);
    expect(ainCalled).toBe(true);
    expect(out.ain).toBe('5425003009');
    expect(out.facts).toEqual({ yearBuilt: 1931, units: 6, useCode: '0500' });
  });
});
