import { NextResponse } from 'next/server';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { ErrorCode, UserAnswers } from '@/lib/rules/types';

export const runtime = 'nodejs';

function err(code: ErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  let body: { address?: string; answers?: UserAnswers };
  try {
    body = await request.json();
  } catch {
    return err('INVALID_BODY', 400);
  }

  const address = body.address?.trim();
  if (!address) return err('ADDRESS_REQUIRED', 400);

  try {
    const result = await lookup(address, body.answers ?? {});
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AddressNotFoundError) return err('ADDRESS_NOT_FOUND', 404);
    return err('UPSTREAM_ERROR', 502);
  }
}
