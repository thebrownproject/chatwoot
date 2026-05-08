/**
 * `withAccount` route handler middleware.
 *
 * Verifies the caller has a session, extracts the `accountId` from the URL
 * (Chatwoot routes are scoped under `/api/v1/accounts/:accountId/...`), and
 * confirms membership before invoking the wrapped handler.
 */

export type WithAccountContext = {
  accountId: bigint;
  userId: bigint;
};

export type WithAccountHandler<T> = (
  req: Request,
  ctx: WithAccountContext,
) => Promise<T>;

/**
 * Wrap a Next.js route handler so it only runs for an authenticated user
 * who is a member of the account in the URL.
 */
export function withAccount<T>(
  _handler: WithAccountHandler<T>,
): (req: Request) => Promise<T | Response> {
  // TODO: read the Auth.js session (or fall back to the devise-token_auth
  // header tuple via `extractDeviseHeaders` + `validateDeviseToken` for
  // Rails-issued sessions during cutover).
  // TODO: parse `accountId` from the URL pathname and verify the user has an
  // `account_users` row for that account before calling the inner handler.
  // Return 401/403 Responses when those checks fail.
  return async () => {
    throw new Error('withAccount: not implemented');
  };
}
