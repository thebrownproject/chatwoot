// GET (list) + POST (create) conversations within an account.
// Source parity: Rails `Api::V1::Accounts::ConversationsController#index/create`
// (`config/routes.rb` -> resources :conversations).
import { withAccount } from '@chatwoot-next/auth';
import { db } from '@/lib/db';

export const GET = withAccount(async (_req, _ctx) => {
  // const scoped = db.forAccount(ctx.accountId);
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});

export const POST = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});
