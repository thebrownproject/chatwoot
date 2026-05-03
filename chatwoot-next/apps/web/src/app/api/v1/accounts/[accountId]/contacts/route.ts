// Contacts collection — index + create.
// Source parity: Rails `Api::V1::Accounts::ContactsController` (`#index`).
import { withAccount } from '@chatwoot-next/auth';
import { db } from '@/lib/db';
import {
  CONTACT_INCLUDE_OPTIONS,
  InvalidContactSortError,
  listContacts,
  type ContactInclude,
  type ContactListParams,
} from '@/lib/queries/contacts';

export const GET = withAccount(async (req, ctx) => {
  const { searchParams } = new URL(req.url);

  const pageRaw = searchParams.get('page');
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
  if (page !== undefined && (!Number.isFinite(page) || page < 1)) {
    return Response.json({ error: 'Invalid page' }, { status: 400 });
  }

  const includeParam = searchParams.getAll('include[]').concat(searchParams.getAll('include'));
  const include: ContactInclude[] = [];
  for (const value of includeParam) {
    for (const part of value.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!(CONTACT_INCLUDE_OPTIONS as readonly string[]).includes(part)) {
        return Response.json({ error: `Unknown include: ${part}` }, { status: 400 });
      }
      include.push(part as ContactInclude);
    }
  }

  const params: ContactListParams = {
    accountId: ctx.accountId,
    ...(page !== undefined ? { page } : {}),
    ...(searchParams.get('sort') ? { sort: searchParams.get('sort')! } : {}),
    ...(searchParams.get('q') ? { q: searchParams.get('q')! } : {}),
    ...(include.length > 0 ? { include } : {}),
  };

  try {
    const result = await listContacts(params, db);
    return Response.json(result);
  } catch (error) {
    if (error instanceof InvalidContactSortError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const POST = withAccount(async (_req, _ctx) => {
  void db;
  return Response.json({ error: 'not implemented' }, { status: 501 });
});
