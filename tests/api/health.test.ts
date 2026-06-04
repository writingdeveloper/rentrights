import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('health route', () => {
  it('returns 200 with an ok status, no dependencies', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
