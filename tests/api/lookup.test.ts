import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/compute/lookup', async (orig) => {
  const actual = await orig<typeof import('@/lib/compute/lookup')>();
  return {
    ...actual,
    lookup: vi.fn(async (address: string) => ({
      address, jurisdiction: { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
      facts: { yearBuilt: 1931, units: 6, useCode: '0500' },
      result: { regime: 'RSO', confidence: 'high', reasons: [{ code: 'IN_LA_CITY' }], questions: [] },
      dataWarnings: [], lastVerified: '2026-06-02',
    })),
  };
});

import { POST } from '@/app/api/lookup/route';

// Each test gets a unique fake IP so they don't share the rate-limit bucket.
// (Without x-forwarded-for, all requests fall into the shared 'unknown' bucket
// whose conservative limit of 5 req/min would be exhausted across the test suite.)
let ipCounter = 1;
function req(body: unknown) {
  const ip = `10.0.0.${ipCounter++}`;
  return new Request('http://localhost/api/lookup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-forwarded-for': ip },
  });
}

describe('POST /api/lookup', () => {
  it('returns a regime result for a valid address', async () => {
    const res = await POST(req({ address: '1411 Murray Dr, Los Angeles' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.regime).toBe('RSO');
  });

  it('400s when address is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('ADDRESS_REQUIRED');
  });

  // --- P1: answers validation ---

  it('accepts a valid answers object with boolean fields', async () => {
    const res = await POST(req({
      address: '1411 Murray Dr, Los Angeles',
      answers: { builtBeforeOct1978: true, isSeparateHouse: false },
    }));
    expect(res.status).toBe(200);
  });

  it('accepts answers omitted entirely (treated as empty object)', async () => {
    const res = await POST(req({ address: '1411 Murray Dr, Los Angeles' }));
    expect(res.status).toBe(200);
  });

  it('400s when answers is not a plain object (array)', async () => {
    const res = await POST(req({ address: '1411 Murray Dr, Los Angeles', answers: [true, false] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('400s when answers is not a plain object (string)', async () => {
    const res = await POST(req({ address: '1411 Murray Dr, Los Angeles', answers: 'yes' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('400s when a boolean field is a non-boolean (string)', async () => {
    const res = await POST(req({
      address: '1411 Murray Dr, Los Angeles',
      answers: { builtBeforeOct1978: 'yes' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('400s when a boolean field is a non-boolean (number)', async () => {
    const res = await POST(req({
      address: '1411 Murray Dr, Los Angeles',
      answers: { isCondo: 1 },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('400s when unsure is not an array', async () => {
    const res = await POST(req({
      address: '1411 Murray Dr, Los Angeles',
      answers: { unsure: 'IS_CONDO' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('400s when unsure contains non-string items', async () => {
    const res = await POST(req({
      address: '1411 Murray Dr, Los Angeles',
      answers: { unsure: [42] },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_BODY');
  });

  it('silently truncates an oversized unsure array (>20 items) instead of 400ing', async () => {
    const bigUnsure = Array.from({ length: 30 }, () => 'IS_CONDO');
    const res = await POST(req({
      address: '1411 Murray Dr, Los Angeles',
      answers: { unsure: bigUnsure },
    }));
    // Capped, not rejected — the request proceeds
    expect(res.status).toBe(200);
  });
});
