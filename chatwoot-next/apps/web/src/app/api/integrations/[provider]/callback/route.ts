// Integration OAuth callback (Slack / Linear / Notion / Shopify / etc.).
// Source parity: Rails `Integrations::*::CallbackController` family.
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  _ctx: { params: Promise<{ provider: string }> },
) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}

export async function POST(
  _req: Request,
  _ctx: { params: Promise<{ provider: string }> },
) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}
