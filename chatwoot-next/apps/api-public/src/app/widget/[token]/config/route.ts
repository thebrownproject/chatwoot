import { NextResponse } from 'next/server';

// Rails source: `config/routes.rb` →
//   namespace :widget do
//     resource :config, only: [:create]
//   end
// Controller: `app/controllers/api/v1/widget/configs_controller.rb`.
// GET /widget/:token/config — returns widget bootstrap config keyed by
// the inbox `website_token`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request, _ctx: { params: Promise<{ token: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
