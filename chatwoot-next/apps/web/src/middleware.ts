import { NextResponse, type NextRequest } from 'next/server';
// Auth.js v5 — `auth()` is a Next.js middleware-compatible helper exported
// from the shared auth config. Stubbed import path; resolves once
// `@chatwoot-next/auth` exposes it.
import { auth } from '@/lib/auth';

// Tenancy middleware:
// - matches `/[accountId]/...` (numeric segment)
// - validates the Auth.js session
// - stamps `x-account-id` on the downstream request so route handlers and
//   the scoped DB client can read it without re-parsing the URL
const ACCOUNT_PATH = /^\/(\d+)(?:\/|$)/;
const PUBLIC_PATHS = ['/login', '/signup', '/reset-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const match = pathname.match(ACCOUNT_PATH);
  if (!match) return NextResponse.next();

  const session = await auth();
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-account-id', match[1]!);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Skip static assets and Next internals
  matcher: ['/((?!_next/|api/auth|.*\\..*).*)'],
};
