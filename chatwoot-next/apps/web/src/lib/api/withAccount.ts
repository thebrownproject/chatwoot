// Account-scoped route handler middleware for the Next.js app router.
//
// Wraps a route handler so that every request:
//   1. Has an authenticated session (Auth.js v5 `auth()`).
//   2. Carries an `accountId` URL segment that parses to a positive bigint.
//   3. Belongs to the session user via an `account_users` row.
//
// Source parity: Rails `Api::V1::Accounts::BaseController` performs the same
// gating via `set_current_user`/`switch_locale`/`pundit_user` and the
// `Account#authorize` Pundit policy that checks `account_users` membership.
//
// The handler is invoked with `{ accountId, userId, session }` plus the
// original `Request` and Next.js `params` object. We deliberately keep the
// shape compatible with the stub `withAccount` exported from
// `@chatwoot-next/auth` so callers can swap once the package version lands.
import { and, eq } from 'drizzle-orm';
import { accountUsers } from '@chatwoot-next/db';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// `auth()` from Auth.js v5 has multiple overloads (no-arg returns the
// session; with-handler returns a route wrapper). We only use the no-arg
// form; this type captures the session shape we care about.
type AuthSession = {
  user?: {
    id?: string | number | bigint;
    email?: string | null;
    name?: string | null;
  };
  expires?: string;
} | null;

export type WithAccountContext = {
  accountId: bigint;
  userId: bigint;
  session: NonNullable<AuthSession>;
};

export type RouteParams = { accountId: string };

export type WithAccountHandler = (
  req: Request,
  ctx: WithAccountContext & { params: RouteParams },
) => Promise<Response> | Response;

type NextRouteContext = { params: Promise<RouteParams> | RouteParams };

function parseAccountId(raw: string | undefined): bigint | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  try {
    const value = BigInt(raw);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}

export function withAccount(handler: WithAccountHandler) {
  return async (req: Request, context: NextRouteContext): Promise<Response> => {
    const session = (await (auth as () => Promise<AuthSession>)()) as AuthSession;
    const userIdRaw = session?.user?.id;
    if (!session || userIdRaw === undefined || userIdRaw === null) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const accountId = parseAccountId(params?.accountId);
    if (accountId === null) {
      return Response.json({ error: 'invalid account id' }, { status: 400 });
    }

    let userId: bigint;
    try {
      userId = typeof userIdRaw === 'bigint' ? userIdRaw : BigInt(userIdRaw);
    } catch {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const membership = await db
      .select({ id: accountUsers.id })
      .from(accountUsers)
      .where(and(eq(accountUsers.accountId, accountId), eq(accountUsers.userId, userId)))
      .limit(1);

    if (membership.length === 0) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    return handler(req, { accountId, userId, session, params });
  };
}
