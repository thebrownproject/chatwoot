import { redirect } from 'next/navigation';

// Root route — unauthenticated users land on the login page.
// Authenticated routing into `/[accountId]/...` is handled by middleware
// once a session exists.
export default function RootPage() {
  redirect('/login');
}
