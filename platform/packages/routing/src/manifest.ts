export const manifest = {
  name: 'routing',
  label: 'Routing',
  description: 'Assignment rules, round-robin, team routing, and snooze scheduler',
  capabilities: ['manage_routing_rules', 'manage_teams'],
  routes: [
    { path: '/routing-rules', module: './routes/routing-rules.js' },
    { path: '/teams', module: './routes/teams.js' },
  ],
  jobs: [
    {
      name: 'check-snoozed-conversations',
      cron: '* * * * *',
      module: './jobs/snooze-scheduler.js',
    },
  ],
} as const;
