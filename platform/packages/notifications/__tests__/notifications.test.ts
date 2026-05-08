import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from '../src/data/notifications.js';
import type { NotificationDb } from '../src/data/notifications.js';
import type { Notification, CreateNotificationData } from '../src/types.js';

/**
 * In-memory DB mock that stores notifications in an array.
 * Simulates SQL behavior for testing data layer logic.
 */
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

        // Check for read filter
        if (sql.includes('read = $')) {
          const readVal = params![1] as boolean;
          filtered = filtered.filter((r) => r.read === readVal);
        }

        // Check for type filter
        if (sql.includes('type = $')) {
          const typeIdx = sql.includes('read = $') ? 2 : 1;
          const typeVal = params![typeIdx] as string;
          filtered = filtered.filter((r) => r.type === typeVal);
        }

        // Sort: unread first, then by createdAt desc
        filtered.sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        return filtered as T[];
      }

      return [] as T[];
    },

    async execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }> {
      if (sql.includes('UPDATE notifications SET read = true') && sql.includes('WHERE id =')) {
        const [id] = params as [string];
        const idx = rows.findIndex((r) => r.id === id);
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
        const [id] = params as [string];
        const idx = rows.findIndex((r) => r.id === id);
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

    await markAsRead(db, n1.id);

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

  it('marks a notification as read', async () => {
    const n = await createNotification(db, sampleData);
    expect(n.read).toBe(false);

    const success = await markAsRead(db, n.id);
    expect(success).toBe(true);

    const count = await getUnreadCount(db, 'user-1');
    expect(count).toBe(0);
  });

  it('marks all as read for a user', async () => {
    await createNotification(db, sampleData);
    await createNotification(db, { ...sampleData, type: 'mention' });
    await createNotification(db, { ...sampleData, userId: 'user-2' });

    const count = await markAllAsRead(db, 'user-1');
    expect(count).toBe(2);

    const unread = await getUnreadCount(db, 'user-1');
    expect(unread).toBe(0);

    // user-2 should still have unread
    const user2Unread = await getUnreadCount(db, 'user-2');
    expect(user2Unread).toBe(1);
  });

  it('deletes a notification', async () => {
    const n = await createNotification(db, sampleData);
    const success = await deleteNotification(db, n.id);
    expect(success).toBe(true);

    const list = await listNotifications(db, 'user-1');
    expect(list).toHaveLength(0);
  });

  it('returns false for non-existent notification delete', async () => {
    const success = await deleteNotification(db, 'non-existent');
    expect(success).toBe(false);
  });

  it('returns false for non-existent notification mark as read', async () => {
    const success = await markAsRead(db, 'non-existent');
    expect(success).toBe(false);
  });
});
