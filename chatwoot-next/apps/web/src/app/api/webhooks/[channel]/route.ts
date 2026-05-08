// Inbound channel webhooks (Facebook, WhatsApp, Twilio, Line, Instagram, etc.).
// Source parity: Rails `Webhooks::*Controller` family — verifies signatures
// and enqueues channel-specific message processors.
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  _ctx: { params: Promise<{ channel: string }> },
) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}

export async function POST(
  _req: Request,
  _ctx: { params: Promise<{ channel: string }> },
) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}
