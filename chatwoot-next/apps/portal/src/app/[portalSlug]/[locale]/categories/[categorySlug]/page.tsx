// Category page — list of articles in a category for a given locale.
// Mirrors Rails route `portals/:portal_slug/:locale/categories/:slug`
// (see `Public::Api::V1::Portals::CategoriesController`).

export const revalidate = 3600;

interface PageProps {
  params: { portalSlug: string; locale: string; categorySlug: string };
}

export default function CategoryPage({ params }: PageProps) {
  // TODO: fetch category + articles list (published only) via DB client.
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">
        {params.portalSlug} / {params.locale} / {params.categorySlug}
      </h1>
      <p className="mt-2 text-slate-600">Articles list goes here.</p>
    </main>
  );
}
