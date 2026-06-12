import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// /es serves the Spanish rendering of the home page from the SAME route as "/",
// rewritten with a forced-locale header the root layout reads (lib getLocale).
// This gives Spanish content a crawlable, indexable URL + hreflang without a
// duplicate page tree, so Googlebot (which crawls as en-US) can surface the
// Spanish version. "/" stays cookie/Accept-Language negotiated for users.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/';
  const headers = new Headers(req.headers);
  headers.set('x-rr-locale', 'es');
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: ['/es', '/es/'] };
