// Inboxes collection — index + create.
// Source parity: Rails `Api::V1::Accounts::InboxesController#index`
// (`app/controllers/api/v1/accounts/inboxes_controller.rb`,
// `app/views/api/v1/models/_inbox.json.jbuilder`).
import { withAccount } from '@chatwoot-next/auth';
import { db } from '@/lib/db';
import { listInboxes } from '@/lib/queries/inboxes';

// Inbox ids fit in Postgres `serial`, but channel-specific bigint fields and
// other Phase 1 endpoints serialize bigints as strings via this replacer.
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export const GET = withAccount(async (_req, ctx) => {
  const result = await listInboxes(
    { accountId: ctx.accountId, userId: ctx.userId },
    db,
  );
  return new Response(JSON.stringify(result, bigintReplacer), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});

export const POST = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});
