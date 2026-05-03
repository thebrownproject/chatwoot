import { NextResponse } from 'next/server';

// Rails source:
// `app/controllers/public/api/v1/inboxes/conversations_controller.rb`.
// Creates / lists conversations for an API-channel contact.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(
  _request: Request,
  _ctx: { params: Promise<{ token: string; contactId: string }> },
) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(
  _request: Request,
  _ctx: { params: Promise<{ token: string; contactId: string }> },
) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
