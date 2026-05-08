// Inboxes collection — index + create.
// Source parity: Rails `Api::V1::Accounts::InboxesController#index`
// (`app/controllers/api/v1/accounts/inboxes_controller.rb`,
// `app/views/api/v1/models/_inbox.json.jbuilder`).
import { withAccount } from '@/lib/api/withAccount';
import { listInboxes } from '@/lib/queries/inboxes';

// Channel-table bigint ids surface in some channel-specific fields; serialize
// them as strings, matching the convention used by other Phase 1 endpoints.
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export const GET = withAccount(async (_req, ctx) => {
  const result = await listInboxes({ accountId: ctx.accountId, userId: ctx.userId });
  return new Response(JSON.stringify(result, bigintReplacer), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});

export const POST = withAccount(async () =>
  Response.json({ error: 'not implemented' }, { status: 501 }),
);
