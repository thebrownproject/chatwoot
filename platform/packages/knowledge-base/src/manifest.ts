/**
 * Knowledge base module manifest.
 *
 * Registers the module with the shell for navigation and permissions.
 */

import type { ModuleManifest } from '@buildpass/shell';

export const manifest: ModuleManifest = {
  name: 'knowledge-base',
  routes: ['/portals', '/categories', '/articles', '/help'],
  navItems: [
    {
      label: 'Knowledge Base',
      href: '/portals',
      icon: 'book-open',
    },
  ],
  permissions: ['manage_kb', 'publish_articles', 'view_articles'],
};
