// Contacts collection — index + create.
// Source parity: Rails `Api::V1::Accounts::ContactsController`.
import { withAccount } from '@chatwoot-next/auth';
import { db } from '@/lib/db';

export const GET = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});

export const POST = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});
