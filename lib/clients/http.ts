type FetchLike = (url: string) => Promise<Response>;

/**
 * Default per-call ceiling for every upstream request. In practice this only ever
 * bites the LA County Assessor roll query (see `lib/clients/assessor.ts` ROLLS):
 * its `AIN` column is unindexed upstream, so an `AIN=` filter full-scans ~2.4M
 * rows/year and can take 13–55s. Bounding it lets a slow/hung upstream fail fast;
 * the lookup then degrades to the confirming-questions path instead of hanging.
 * Override with the UPSTREAM_TIMEOUT_MS env var (e.g. raise it to trade a longer
 * spinner for more auto-detection on cold lookups).
 */
export const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 12000;

/**
 * Wrap a fetch with an AbortController timeout. Returns a `(url) => Promise<Response>`
 * that rejects with an AbortError if the request outlives `ms`. The timer is always
 * cleared so a completed request leaves nothing pending.
 */
export function timeoutFetch(ms: number = UPSTREAM_TIMEOUT_MS, baseFetch: typeof fetch = fetch): FetchLike {
  return async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await baseFetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
