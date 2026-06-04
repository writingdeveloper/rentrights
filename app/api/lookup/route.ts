import { NextResponse } from 'next/server';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { ErrorCode, UserAnswers } from '@/lib/rules/types';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function err(code: ErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  const rl = rateLimit(`lookup:${clientKey(request)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: { address?: string; answers?: UserAnswers };
  try {
    body = await request.json();
  } catch {
    return err('INVALID_BODY', 400);
  }

  const address = body.address?.trim();
  // Real addresses are well under 500 chars; cap to bound outbound requests and
  // avoid adversarial regex work in stripUnit.
  if (!address || address.length > 500) return err('ADDRESS_REQUIRED', 400);

  try {
    const result = await lookup(address, body.answers ?? {});
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AddressNotFoundError) return err('ADDRESS_NOT_FOUND', 404);
    return err('UPSTREAM_ERROR', 502);
  }
}
