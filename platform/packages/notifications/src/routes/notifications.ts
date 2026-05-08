import { Hono } from 'hono';
import { z } from 'zod';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../data/notifications.js';
import { getSettings, updateSettings } from '../data/notification-settings.js';
import type { NotificationDb } from '../data/notifications.js';
import type { NotificationSettingsDb } from '../data/notification-settings.js';

type Db = NotificationDb & NotificationSettingsDb;

interface Env {
  Variables: {
    db: Db;
    userId: string;
  };
}

const updateSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  settings: z
    .object({
      new_message: z.boolean().optional(),
      assignment: z.boolean().optional(),
      mention: z.boolean().optional(),
      status_change: z.boolean().optional(),
      escalation: z.boolean().optional(),
    })
    .optional(),
});

export function createNotificationRoutes() {
  const app = new Hono<Env>();

  // GET /notifications — list current user's notifications
  app.get('/notifications', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const read = c.req.query('read');
    const type = c.req.query('type');
    const limit = c.req.query('limit');
    const offset = c.req.query('offset');

    const notifications = await listNotifications(db, userId, {
      read: read !== undefined ? read === 'true' : undefined,
      type: type as 'new_message' | 'assignment' | 'mention' | 'status_change' | 'escalation' | undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return c.json({ data: notifications });
  });

  // GET /notifications/unread-count — get unread count
  app.get('/notifications/unread-count', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const count = await getUnreadCount(db, userId);
    return c.json({ data: { count } });
  });

  // POST /notifications/:id/read — mark as read
  app.post('/notifications/:id/read', async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    const success = await markAsRead(db, id);
    if (!success) {
      return c.json({ error: 'Notification not found' }, 404);
    }
    return c.json({ ok: true });
  });

  // POST /notifications/read-all — mark all as read
  app.post('/notifications/read-all', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const count = await markAllAsRead(db, userId);
    return c.json({ data: { count } });
  });

  // GET /notifications/settings — get settings
  app.get('/notifications/settings', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const settings = await getSettings(db, userId);
    return c.json({ data: settings });
  });

  // PATCH /notifications/settings — update settings
  app.patch('/notifications/settings', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const body = await c.req.json();

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
    }

    const settings = await updateSettings(db, userId, parsed.data);
    return c.json({ data: settings });
  });

  return app;
}
