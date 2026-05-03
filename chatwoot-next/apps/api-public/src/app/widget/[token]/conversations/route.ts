import { NextResponse } from 'next/server';

// Rails source: `config/routes.rb` →
//   namespace :widget do
//     resources :conversations, only: [:index, :create]
//   end
// Controller: `app/controllers/api/v1/widget/conversations_controller.rb`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request, _ctx: { params: Promise<{ token: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request, _ctx: { params: Promise<{ token: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
