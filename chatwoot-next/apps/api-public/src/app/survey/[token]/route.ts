import { NextResponse } from 'next/server';

// Rails source: `config/routes.rb` →
//   namespace :survey do
//     resources :responses, only: [:show, :update]
//   end
// Controller: `app/controllers/survey/responses_controller.rb` — fetches
// the survey config / current answer state by survey token.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request, _ctx: { params: Promise<{ token: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
