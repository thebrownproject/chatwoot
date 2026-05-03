// Resolve a public widget / API channel token to its inbox + account.
//
// Rails counterparts:
//   * `Inbox#website_token`  — used by the web widget (`/widget/*`).
//   * `Inbox#api_token`      — used by API channel inboxes
//                              (`/public/api/v1/inboxes/:identifier/*`).
//
// The Postgres lookup will live in `@chatwoot-next/db` once schema
// access is wired up; this stub just shapes the call site.
export async function validatePublicToken(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _token: string,
): Promise<{ inboxId: bigint; accountId: bigint } | null> {
  // TODO: SELECT id, account_id FROM inboxes
  //       WHERE website_token = $1 OR api_token = $1 LIMIT 1
  return null;
}
