// Zero-dependency in-memory fixed-window rate limiter. Defense-in-depth only:
// it is per-process, so on multi-instance/serverless it under-counts — the
// authoritative ceiling belongs at the reverse proxy (e.g. Nginx limit_req).
// Limits here are generous to avoid false-positives behind shared NATs.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastPrune = 0;

function prune(now: number): void {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}

export interface RateResult {
  ok: boolean;
  retryAfterMs: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateResult {
  prune(now);
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (b.count < limit) {
    b.count++;
    return { ok: true, retryAfterMs: 0 };
  }
  return { ok: false, retryAfterMs: b.resetAt - now };
}

/** Best-effort client identity for rate-limiting: the first forwarded IP. */
export function clientKey(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
