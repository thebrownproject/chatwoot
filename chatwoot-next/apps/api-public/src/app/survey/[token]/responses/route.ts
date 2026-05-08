import { NextResponse } from 'next/server';

// Rails source: `app/controllers/survey/responses_controller.rb#update`
// (PATCH /survey/responses/:id). Posts the customer's CSAT response
// against the survey token.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request, _ctx: { params: Promise<{ token: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
