import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/compute/lookup', async (orig) => {
  const actual = await orig<typeof import('@/lib/compute/lookup')>();
  return {
    ...actual,
    lookup: vi.fn(async (address: string) => ({
      address, jurisdiction: { inLACity: true, placeName: 'Los Angeles city', incorporated: true },
      facts: { yearBuilt: 1931, units: 6, useCode: '0500' },
      result: { regime: 'RSO', confidence: 'high', reasons: ['In the City of Los Angeles'], questions: [] },
      dataWarnings: [], lastVerified: '2026-06-02',
    })),
  };
});

import { POST } from '@/app/api/lookup/route';

function req(body: unknown) {
  return new Request('http://localhost/api/lookup', { method: 'POST', body: JSON.stringify(body) });
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
  });
});
