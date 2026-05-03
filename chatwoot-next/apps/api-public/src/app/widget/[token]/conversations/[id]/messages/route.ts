import { NextResponse } from 'next/server';

// Rails source: `config/routes.rb` →
//   namespace :widget do
//     resources :messages, only: [:index, :create, :update]
//   end
// Controller: `app/controllers/api/v1/widget/messages_controller.rb`.
// POST /widget/:token/conversations/:id/messages — creates an incoming
// message in the widget conversation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(
  _request: Request,
  _ctx: { params: Promise<{ token: string; id: string }> },
) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
