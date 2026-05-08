import { NextResponse, type NextRequest } from 'next/server';

// Stub middleware for the public API surface.
//
// Responsibilities (to be implemented):
//   1. Handle CORS preflight (OPTIONS) for `/widget/*` and `/public/*` —
//      look up the website token in the URL, resolve the inbox's allowed
//      origin, and echo it back in `Access-Control-Allow-Origin`.
//   2. Validate the publicToken on entry (see `src/lib/public-token.ts`)
//      so route handlers can trust `request.headers` for the inbox/account
//      context, and short-circuit invalid tokens with 401.
//
// This is cross-domain, public-token auth — there is no NextAuth session
// to read here.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/widget/:path*', '/public/:path*', '/survey/:path*', '/portal/:path*'],
};
