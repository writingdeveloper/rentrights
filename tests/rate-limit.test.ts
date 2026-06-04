import { describe, it, expect } from 'vitest';
import { rateLimit, clientKey } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows up to the limit, then blocks within the window', () => {
    const k = 'ip-a';
    const now = 1000;
    expect(rateLimit(k, 3, 60_000, now).ok).toBe(true);
    expect(rateLimit(k, 3, 60_000, now).ok).toBe(true);
    expect(rateLimit(k, 3, 60_000, now).ok).toBe(true);
    const blocked = rateLimit(k, 3, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    const k = 'ip-reset';
    expect(rateLimit(k, 1, 60_000, 0).ok).toBe(true);
    expect(rateLimit(k, 1, 60_000, 0).ok).toBe(false);
    expect(rateLimit(k, 1, 60_000, 60_001).ok).toBe(true);
  });

  it('tracks keys independently', () => {
    const now = 5000;
    expect(rateLimit('ip-x', 1, 60_000, now).ok).toBe(true);
    expect(rateLimit('ip-x', 1, 60_000, now).ok).toBe(false);
    expect(rateLimit('ip-y', 1, 60_000, now).ok).toBe(true);
  });
});

describe('clientKey', () => {
  it('uses the first x-forwarded-for IP', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
    expect(clientKey(req)).toBe('203.0.113.7');
  });
  it('falls back to x-real-ip, then "unknown"', () => {
    expect(clientKey(new Request('http://x', { headers: { 'x-real-ip': '198.51.100.4' } }))).toBe('198.51.100.4');
    expect(clientKey(new Request('http://x'))).toBe('unknown');
  });
});
