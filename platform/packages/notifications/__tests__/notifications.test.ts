import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  isValidNotificationType,
} from '../src/data/notifications.js';
import type { NotificationDb } from '../src/data/notifications.js';
import type { Notification, CreateNotificationData } from '../src/types.js';

function createMockDb(): NotificationDb & { rows: Notification[] } {
  const rows: Notification[] = [];

  return {
    rows,
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      if (sql.includes('INSERT INTO notifications')) {
        const [id, userId, type, title, body, conversationId, , createdAt, updatedAt] = params as [
          string, string, string, string, string, string | null, boolean, Date, Date,
        ];
        const notification: Notification = {
          id,
          userId,
          type: type as Notification['type'],
          title,
          body,
          conversationId,
          read: false,
          createdAt,
          updatedAt,
        };
        rows.push(notification);
        return [notification] as T[];
      }

      if (sql.includes('FROM notifications') && sql.includes('COUNT')) {
        const [userId] = params as [string];
        const count = rows.filter((r) => r.userId === userId && !r.read).length;
        return [{ count }] as T[];
      }

      if (sql.includes('FROM notifications') && sql.includes('SELECT')) {
        const [userId] = params as [string];
        let filtered = rows.filter((r) => r.userId === userId);

        if (sql.includes('read = $')) {
          const readVal = params![1] as boolean;
          filtered = filtered.filter((r) => r.read === readVal);
        }

        if (sql.includes('type = $')) {
          const typeIdx = sql.includes('read = $') ? 2 : 1;
          const typeVal = params![typeIdx] as string;
          filtered = filtered.filter((r) => r.type === typeVal);
        }

        filtered.sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        // Apply limit/offset from params
        const limitIdx = params!.length - 2;
        const offsetIdx = params!.length - 1;
        const limit = params![limitIdx] as number;
        const offset = params![offsetIdx] as number;
        filtered = filtered.slice(offset, offset + limit);

        return filtered as T[];
      }

      return [] as T[];
    },

    async execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }> {
      if (sql.includes('UPDATE notifications SET read = true') && sql.includes('WHERE id =')) {
        const [id, userId] = params as [string, string];
        const idx = rows.findIndex((r) => r.id === id && r.userId === userId);
        if (idx >= 0) {
          rows[idx]!.read = true;
          return { rowCount: 1 };
        }
        return { rowCount: 0 };
      }

      if (sql.includes('UPDATE notifications SET read = true') && sql.includes('WHERE user_id =')) {
        const [userId] = params as [string];
        let count = 0;
        for (const r of rows) {
          if (r.userId === userId && !r.read) {
            r.read = true;
            count++;
          }
        }
        return { rowCount: count };
      }

      if (sql.includes('DELETE FROM notifications')) {
        const [id, userId] = params as [string, string];
        const idx = rows.findIndex((r) => r.id === id && r.userId === userId);
        if (idx >= 0) {
          rows.splice(idx, 1);
          return { rowCount: 1 };
        }
        return { rowCount: 0 };
      }

      return { rowCount: 0 };
    },
  };
}

describe('notifications data layer', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  const sampleData: CreateNotificationData = {
    userId: 'user-1',
    type: 'new_message',
    title: 'New message',
    body: 'You have a new message',
    conversationId: 'conv-1',
  };

  it('creates a notification', async () => {
    const notification = await createNotification(db, sampleData);

    expect(notification.userId).toBe('user-1');
    expect(notification.type).toBe('new_message');
    expect(notification.title).toBe('New message');
    expect(notification.read).toBe(false);
    expect(notification.conversationId).toBe('conv-1');
    expect(notification.id).toBeTruthy();
  });

  it('trims title and body on create', async () => {
    const notification = await createNotification(db, {
      ...sampleData,
      title: '  Hello  ',
      body: '  World  ',
    });
    expect(notification.title).toBe('Hello');
    expect(notification.body).toBe('World');
  });

  it('rejects whitespace-only title', async () => {
    await expect(
      createNotification(db, { ...sampleData, title: '   ' }),
    ).rejects.toThrow('Notification title cannot be empty');
  });

  it('rejects whitespace-only body', async () => {
    await expect(
      createNotification(db, { ...sampleData, body: '   ' }),
    ).rejects.toThrow('Notification body cannot be empty');
  });

  it('rejects empty userId', async () => {
    await expect(
      createNotification(db, { ...sampleData, userId: '' }),
    ).rejects.toThrow('Notification userId is required');
  });

  it('lists notifications for a user', async () => {
    await createNotification(db, sampleData);
    await createNotification(db, { ...sampleData, type: 'assignment', title: 'Assigned' });
    await createNotification(db, { ...sampleData, userId: 'user-2' });

    const list = await listNotifications(db, 'user-1');
    expect(list).toHaveLength(2);
  });

  it('lists unread first', async () => {
    const n1 = await createNotification(db, sampleData);
    await createNotification(db, { ...sampleData, type: 'mention', title: 'Mention' });

    await markAsRead(db, n1.id, 'user-1');

    const list = await listNotifications(db, 'user-1');
    expect(list[0]!.read).toBe(false);
    expect(list[1]!.read).toBe(true);
  });

  it('returns unread count', async () => {
    await createNotification(db, sampleData);
    await createNotification(db, { ...sampleData, type: 'mention' });

    const count = await getUnreadCount(db, 'user-1');
    expect(count).toBe(2);
  });

  it('marks a notification as read (scoped to user)', async () => {
    const n = await createNotification(db, sampleData);
    expect(n.read).toBe(false);

    const success = await markAsRead(db, n.id, 'user-1');
    expect(success).toBe(true);

    const count = await getUnreadCount(db, 'user-1');
    expect(count).toBe(0);
  });

  it('cannot mark another user notification as read', async () => {
    const n = await createNotification(db, sampleData);
    const success = await markAsRead(db, n.id, 'user-2');
    expect(success).toBe(false);
    expect(n.read).toBe(false);
  });

  it('marks all as read for a user', async () => {
    await createNotification(db, sampleData);
    await createNotification(db, { ...sampleData, type: 'mention' });
    await createNotification(db, { ...sampleData, userId: 'user-2' });

    const count = await markAllAsRead(db, 'user-1');
    expect(count).toBe(2);

    const unread = await getUnreadCount(db, 'user-1');
    expect(unread).toBe(0);

    const user2Unread = await getUnreadCount(db, 'user-2');
    expect(user2Unread).toBe(1);
  });

  it('deletes a notification (scoped to user)', async () => {
    const n = await createNotification(db, sampleData);
    const success = await deleteNotification(db, n.id, 'user-1');
    expect(success).toBe(true);

    const list = await listNotifications(db, 'user-1');
    expect(list).toHaveLength(0);
  });

  it('cannot delete another user notification', async () => {
    const n = await createNotification(db, sampleData);
    const success = await deleteNotification(db, n.id, 'user-2');
    expect(success).toBe(false);
    expect(db.rows).toHaveLength(1);
  });

  it('returns false for non-existent notification delete', async () => {
    const success = await deleteNotification(db, 'non-existent', 'user-1');
    expect(success).toBe(false);
  });

  it('returns false for non-existent notification mark as read', async () => {
    const success = await markAsRead(db, 'non-existent', 'user-1');
    expect(success).toBe(false);
  });

  it('clamps limit to 1-200 range', async () => {
    for (let i = 0; i < 5; i++) {
      await createNotification(db, { ...sampleData, title: `msg ${i}`, body: `body ${i}` });
    }
    const list = await listNotifications(db, 'user-1', { limit: 2 });
    expect(list).toHaveLength(2);
  });

  it('clamps negative limit to 1', async () => {
    await createNotification(db, sampleData);
    const list = await listNotifications(db, 'user-1', { limit: -5 });
    expect(list).toHaveLength(1);
  });

  it('clamps negative offset to 0', async () => {
    await createNotification(db, sampleData);
    const list = await listNotifications(db, 'user-1', { offset: -10 });
    expect(list).toHaveLength(1);
  });

  it('rejects invalid notification type filter', async () => {
    await expect(
      listNotifications(db, 'user-1', { type: 'garbage' as never }),
    ).rejects.toThrow('Invalid notification type');
  });
});

describe('isValidNotificationType', () => {
  it('accepts valid types', () => {
    expect(isValidNotificationType('new_message')).toBe(true);
    expect(isValidNotificationType('assignment')).toBe(true);
    expect(isValidNotificationType('mention')).toBe(true);
    expect(isValidNotificationType('status_change')).toBe(true);
    expect(isValidNotificationType('escalation')).toBe(true);
  });

  it('rejects invalid types', () => {
    expect(isValidNotificationType('garbage')).toBe(false);
    expect(isValidNotificationType('')).toBe(false);
  });
});
