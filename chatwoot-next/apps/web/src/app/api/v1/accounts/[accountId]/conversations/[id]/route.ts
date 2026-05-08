// Single conversation: show / update / destroy.
// Source parity: Rails `Api::V1::Accounts::ConversationsController#show/update/destroy`.
import { withAccount } from '@chatwoot-next/auth';
import { db } from '@/lib/db';

export const GET = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});

export const PATCH = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});

export const DELETE = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});
