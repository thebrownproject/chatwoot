import { NextResponse } from 'next/server';

// Rails source: `app/controllers/public/api/v1/inboxes/contacts_controller.rb`.
// API channel ingestion endpoint — creates a contact under the inbox
// identified by `inbox_identifier` (the API channel token).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request, _ctx: { params: Promise<{ token: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
