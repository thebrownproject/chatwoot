// Single inbox — show.
// Source parity: Rails `Api::V1::Accounts::InboxesController#show`
// (`app/controllers/api/v1/accounts/inboxes_controller.rb`,
// `app/views/api/v1/models/_inbox.json.jbuilder`).
import { withAccount } from '@/lib/api/withAccount';
import { InboxNotFoundError, getInbox } from '@/lib/queries/inboxes';

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

function parseInboxId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  try {
    const value = BigInt(raw);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}

export const GET = withAccount(async (_req, ctx) => {
  // The local `withAccount` types `params` as `{ accountId: string }`; nested
  // dynamic segments (`[id]`) are still present at runtime, so we read them
  // through an index access without widening the shared type definition.
  const idRaw = (ctx.params as Record<string, string | undefined>).id;
  const inboxId = parseInboxId(idRaw);
  if (inboxId === null) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const dto = await getInbox({
      accountId: ctx.accountId,
      userId: ctx.userId,
      inboxId,
    });
    return new Response(JSON.stringify(dto, bigintReplacer), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof InboxNotFoundError) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    throw error;
  }
});
