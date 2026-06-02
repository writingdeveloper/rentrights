import { NextResponse } from 'next/server';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { UserAnswers } from '@/lib/rules/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { address?: string; answers?: UserAnswers };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: 'An address is required' }, { status: 400 });
  }

  try {
    const result = await lookup(address, body.answers ?? {});
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AddressNotFoundError) {
      return NextResponse.json({ error: 'We could not find that address. Try including the city, e.g. "123 Main St, Los Angeles".' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Something went wrong looking up that address. Please try again.' }, { status: 502 });
  }
}
