import { NextResponse } from 'next/server';

// Rails source: `config/routes.rb` →
//   get 'hc/:slug/:locale/articles',
//       to: 'public/api/v1/portals/articles#index'
// Controller: `app/controllers/public/api/v1/portals/articles_controller.rb`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request, _ctx: { params: Promise<{ slug: string }> }) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
