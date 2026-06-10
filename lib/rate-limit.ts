// Zero-dependency in-memory fixed-window rate limiter. Defense-in-depth only:
// it is per-process — on Cloudflare Workers state is per-isolate (near no-op
// across PoPs), and on multi-instance hosts it under-counts. The authoritative
// ceiling belongs at the edge: a Cloudflare WAF rate-limiting rule on /api/*
// for rentrights.soursea.io (or Nginx limit_req on a self-host).
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

/**
 * Best-effort client identity for rate-limiting. CF-Connecting-IP wins: behind
 * Cloudflare the first X-Forwarded-For hop is client-spoofable (Cloudflare
 * appends the real IP to a client-supplied XFF). The XFF/x-real-ip fallbacks
 * keep local dev and non-Cloudflare deploys working.
 */
export function clientKey(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
