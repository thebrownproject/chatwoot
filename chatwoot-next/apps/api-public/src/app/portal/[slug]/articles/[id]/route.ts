import { NextResponse } from 'next/server';

// Rails source: `config/routes.rb` →
//   get 'hc/:slug/articles/:article_slug',
//       to: 'public/api/v1/portals/articles#show'
// Controller: `app/controllers/public/api/v1/portals/articles_controller.rb#show`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(
  _request: Request,
  _ctx: { params: Promise<{ slug: string; id: string }> },
) {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
}
