// Single article page. Mirrors Rails route
// `portals/:portal_slug/:locale/articles/:slug` (see
// `Public::Api::V1::Portals::ArticlesController#show`).
//
// Static metadata is generated per-article so search engines and
// social previews pick up the title/description without JS.

import type { Metadata } from 'next';

export const revalidate = 3600;

interface PageProps {
  params: { portalSlug: string; locale: string; articleSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // TODO: load the article and surface title/meta_description/og image.
  return {
    title: `${params.articleSlug} — ${params.portalSlug}`,
  };
}

export default function ArticlePage({ params }: PageProps) {
  // TODO: fetch article body + render via the shared article renderer.
  return (
    <article className="mx-auto max-w-3xl p-6 prose">
      <h1>{params.articleSlug}</h1>
      <p className="text-slate-600">Article body goes here.</p>
    </article>
  );
}
