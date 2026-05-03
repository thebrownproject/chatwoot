import type { ReactNode } from 'react';

// Dashboard shell for the agent UI (sidebar + topbar).
// Source parity: Vue dashboard root in `app/javascript/dashboard/` —
// notably `app/javascript/dashboard/components/layout/Sidebar.vue` and
// `app/javascript/dashboard/components/layout/PrimarySidebar.vue`.
// Tenancy: `accountId` comes from the URL segment and is exposed to the
// scoped DB client by `src/middleware.ts` via the `x-account-id` header.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
  params: Promise<{ accountId: string }>;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r" data-testid="primary-sidebar">
        {/* TODO: PrimarySidebar — port from app/javascript/dashboard/components/layout/Sidebar.vue */}
        Sidebar
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="h-14 border-b" data-testid="topbar">
          {/* TODO: Topbar — search, notifications, account switcher */}
          Topbar
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
