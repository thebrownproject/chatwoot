// Portal landing page — categories list. Replaces the Vue route at
// `app/javascript/portal/components/Portal.vue` and mirrors the Rails
// route `portals#show` (see `config/routes.rb` `resources :portals`).
//
// ISR: 1h revalidate. SEO matters here, and articles change rarely
// enough that on-demand revalidation from the agent dashboard
// (`revalidatePath`) covers fresh edits.

export const revalidate = 3600;

interface PageProps {
  params: { portalSlug: string };
}

export default function PortalLandingPage({ params }: PageProps) {
  // TODO: load portal + categories via `@chatwoot-next/db`
  // (Rails source: `Portal` and `Category` models; queried by slug).
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-semibold">Portal: {params.portalSlug}</h1>
      <p className="mt-2 text-slate-600">Categories list goes here.</p>
    </main>
  );
}
