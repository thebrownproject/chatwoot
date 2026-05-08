import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ShellProvider } from './shell-provider';

export const metadata: Metadata = {
  title: 'Buildpass Inbox',
  description: 'Agent-native messaging platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ShellProvider>{children}</ShellProvider>
      </body>
    </html>
  );
}
