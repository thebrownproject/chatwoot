/** Identity module metadata for the central module registry */
export const manifest = {
  name: 'identity',
  description:
    'Authentication, user management, permissions, and contact deduplication',
  routes: [
    { path: '/users', handler: 'routes/users' },
    { path: '/auth', handler: 'routes/auth' },
  ],
  permissions: [
    'manage_users',
    'view_users',
    'manage_permissions',
  ],
} as const;
