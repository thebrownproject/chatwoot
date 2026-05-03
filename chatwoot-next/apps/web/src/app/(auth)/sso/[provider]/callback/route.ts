// SSO callback stub — OAuth/SAML providers (Google, Azure AD, Okta, generic SAML).
// Source parity: Rails `Auth::OmniauthCallbacksController` + `SamlController`.
// Real handler will exchange code/assertion for a session via Auth.js.
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
