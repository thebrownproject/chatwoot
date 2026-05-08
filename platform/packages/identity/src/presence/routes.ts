import { Hono } from 'hono';
import type { PresenceManager } from './presence-manager.js';

export function createPresenceRoutes(presence: PresenceManager) {
  const app = new Hono();

  // GET /presence/:userId -- get a user's presence
  app.get('/:userId', async (c) => {
    const userId = c.req.param('userId');
    const state = await presence.getPresence(userId);
    return c.json({
      userId,
      status: state.status,
      lastSeen: state.lastSeen.toISOString(),
    });
  });

  // GET /presence -- get all online users
  app.get('/', async (c) => {
    const users = await presence.getOnlineUsers();
    return c.json({ users });
  });

  // POST /presence/heartbeat -- refresh current user's online status
  app.post('/heartbeat', async (c) => {
    const body = await c.req.json<{ userId: string }>();
    await presence.setOnline(body.userId);
    return c.json({ ok: true });
  });

  // POST /presence/status -- set away/busy status
  app.post('/status', async (c) => {
    const body = await c.req.json<{
      userId: string;
      status: 'online' | 'away' | 'busy';
    }>();
    await presence.setStatus(body.userId, body.status);
    return c.json({ ok: true });
  });

  return app;
}
