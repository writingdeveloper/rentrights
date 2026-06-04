import { NextResponse } from 'next/server';
import { fetchSuggestions } from '@/lib/clients/cams';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Cap length defensively (real addresses are well under this) to bound the
  // outbound query and avoid adversarial regex work in stripUnit.
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 200);
  try {
    // fetchSuggestions already returns [] for queries shorter than 4 chars.
    const suggestions = await fetchSuggestions(q);
    return NextResponse.json({ suggestions });
  } catch {
    // Typing must never surface an error — degrade to no suggestions.
    return NextResponse.json({ suggestions: [] });
  }
}
