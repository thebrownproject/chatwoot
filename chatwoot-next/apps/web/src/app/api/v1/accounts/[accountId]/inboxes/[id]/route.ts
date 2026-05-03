// Single inbox — show.
// Source parity: Rails `Api::V1::Accounts::InboxesController#show`
// (`app/controllers/api/v1/accounts/inboxes_controller.rb`,
// `app/views/api/v1/models/_inbox.json.jbuilder`).
import { withAccount } from '@chatwoot-next/auth';
import { db } from '@/lib/db';
import { InboxNotFoundError, getInbox } from '@/lib/queries/inboxes';

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

// `withAccount` wraps `(req)`-only handlers, so the dynamic `[id]` segment is
// recovered from the request URL rather than from Next.js's `params` arg.
function extractInboxId(req: Request): bigint | null {
  try {
    const segments = new URL(req.url).pathname.split('/').filter(Boolean);
    const inboxesIdx = segments.lastIndexOf('inboxes');
    if (inboxesIdx === -1) return null;
    const raw = segments[inboxesIdx + 1];
    if (!raw) return null;
    if (!/^\d+$/.test(raw)) return null;
    return BigInt(raw);
  } catch {
    return null;
  }
}

export const GET = withAccount(async (req, ctx) => {
  const inboxId = extractInboxId(req);
  if (inboxId === null) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const dto = await getInbox(
      { accountId: ctx.accountId, userId: ctx.userId, inboxId },
      db,
    );
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
