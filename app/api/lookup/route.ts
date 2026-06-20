import { NextResponse } from 'next/server';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { ErrorCode, UserAnswers, QuestionId } from '@/lib/rules/types';
import { rateLimit, clientKey, UNKNOWN_KEY_LIMIT, UNKNOWN_KEY_WINDOW_MS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function err(code: ErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

const BOOLEAN_FIELDS = ['builtBeforeOct1978', 'isSeparateHouse', 'hasAb1482ExemptionNotice', 'isCondo'] as const;
const MAX_UNSURE = 20;

/**
 * Runtime-validate and coerce `answers` from untrusted JSON.
 * Returns a sanitised UserAnswers or null if the shape is malformed.
 * - answers must be a plain object (not an array, null, or primitive)
 * - boolean fields are coerced: real booleans pass through, non-booleans reject
 * - unsure, if present, must be a string array capped at MAX_UNSURE items
 */
function parseAnswers(raw: unknown): UserAnswers | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;

  const src = raw as Record<string, unknown>;
  const out: UserAnswers = {};

  for (const field of BOOLEAN_FIELDS) {
    if (field in src) {
      const v = src[field];
      if (typeof v !== 'boolean') return null;
      out[field] = v;
    }
  }

  if ('unsure' in src) {
    const u = src.unsure;
    if (!Array.isArray(u)) return null;
    if (u.some((x) => typeof x !== 'string')) return null;
    // Cap at MAX_UNSURE — drop excess items rather than rejecting to keep it lenient
    out.unsure = (u as string[]).slice(0, MAX_UNSURE) as QuestionId[];
  }

  return out;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const [limit, windowMs] = key === 'unknown'
    ? [UNKNOWN_KEY_LIMIT, UNKNOWN_KEY_WINDOW_MS]
    : [20, 60_000];
  const rl = rateLimit(`lookup:${key}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: { address?: string; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return err('INVALID_BODY', 400);
  }

  const address = body.address?.trim();
  // Real addresses are well under 500 chars; cap to bound outbound requests and
  // avoid adversarial regex work in stripUnit.
  if (!address || address.length > 500) return err('ADDRESS_REQUIRED', 400);

  const answers = parseAnswers(body.answers);
  if (answers === null) return err('INVALID_BODY', 400);

  try {
    const result = await lookup(address, answers);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AddressNotFoundError) return err('ADDRESS_NOT_FOUND', 404);
    return err('UPSTREAM_ERROR', 502);
  }
}
