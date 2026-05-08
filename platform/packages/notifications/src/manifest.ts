import type { NotificationManifest } from './types.js';

export const manifest: NotificationManifest = {
  name: 'notifications',
  routes: [
    'GET /notifications',
    'GET /notifications/unread-count',
    'POST /notifications/:id/read',
    'POST /notifications/read-all',
    'GET /notifications/settings',
    'PATCH /notifications/settings',
  ],
  permissions: [
    'notifications.read',
    'notifications.write',
    'notifications.settings.read',
    'notifications.settings.write',
  ],
};
