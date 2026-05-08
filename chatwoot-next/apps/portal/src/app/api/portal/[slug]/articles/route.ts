// Optional API route mirroring the Rails public API
// `Public::Api::V1::Portals::ArticlesController#index`. Useful when
// a third party needs JSON without scraping rendered HTML.

import { NextResponse } from 'next/server';

interface RouteContext {
  params: { slug: string };
}

export async function GET(_request: Request, _context: RouteContext) {
  // TODO: resolve portal by slug, return published articles JSON.
  return NextResponse.json({ articles: [] });
}
