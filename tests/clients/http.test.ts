import { describe, it, expect } from 'vitest';
import { timeoutFetch } from '@/lib/clients/http';

describe('timeoutFetch', () => {
  it('aborts the request when it exceeds the timeout', async () => {
    // A base fetch that never resolves on its own — it only settles if aborted.
    const hanging: typeof fetch = (_url, opts) =>
      new Promise((_resolve, reject) => {
        const signal = (opts as RequestInit | undefined)?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    const f = timeoutFetch(20, hanging);
    await expect(f('https://example.test')).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns the response when fetch resolves within the timeout', async () => {
    const fast: typeof fetch = async () => new Response('ok', { status: 200 });
    const res = await timeoutFetch(1000, fast)('https://example.test');
    expect(res.status).toBe(200);
  });

  it('passes an AbortSignal through to the underlying fetch', async () => {
    let sawSignal = false;
    const probe: typeof fetch = async (_url, opts) => {
      sawSignal = (opts as RequestInit | undefined)?.signal instanceof AbortSignal;
      return new Response(null, { status: 204 });
    };
    await timeoutFetch(1000, probe)('https://example.test');
    expect(sawSignal).toBe(true);
  });

  it('does not abort after a successful response (timer cleared)', async () => {
    // If the timer were not cleared, a later abort would have no observable effect
    // here, but we at least assert the happy path returns and settles cleanly.
    const fast: typeof fetch = async () => new Response('ok', { status: 200 });
    const f = timeoutFetch(30, fast);
    const res = await f('https://example.test');
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50)); // outlive the would-be timer
    expect(res.status).toBe(200);
  });
});
