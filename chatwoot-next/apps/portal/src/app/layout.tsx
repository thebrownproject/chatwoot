import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

// Root layout. Locale is carried in the URL via `[portalSlug]/[locale]/...`
// — we keep this layout minimal and let route segments wire `next-intl`
// providers where they actually need translations.

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Public help center',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
