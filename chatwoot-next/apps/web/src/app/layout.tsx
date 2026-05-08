import type { ReactNode } from 'react';
import './globals.css';

// Root layout for the agent-facing dashboard SPA.
// Source parity: bootstraps the dashboard equivalent of
// `app/javascript/dashboard/index.js` (Vue) — html/body shell + i18n provider.
export const metadata = {
  title: 'Chatwoot',
  description: 'Agent-facing dashboard',
};

// next-intl provider stub — wire up real messages/locale once the
// `@chatwoot-next/i18n` package exposes a server provider.
function NextIntlProviderStub({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextIntlProviderStub>{children}</NextIntlProviderStub>
      </body>
    </html>
  );
}
