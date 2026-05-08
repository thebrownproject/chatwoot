import type {
  CreateNotificationData,
  Notification,
  NotificationFilters,
} from '../types.js';

/**
 * Database interface for notification operations.
 * All functions take a `db` adapter as the first parameter,
 * keeping the data layer decoupled from any specific ORM/driver.
 */
export interface NotificationDb {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
}

export async function createNotification(
  db: NotificationDb,
  data: CreateNotificationData,
): Promise<Notification> {
  const id = crypto.randomUUID();
  const now = new Date();

  const rows = await db.query<Notification>(
    `INSERT INTO notifications (id, user_id, type, title, body, conversation_id, read, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
     RETURNING id, user_id AS "userId", type, title, body, conversation_id AS "conversationId", read, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, data.userId, data.type, data.title, data.body, data.conversationId ?? null, now, now],
  );

  return rows[0]!;
}

export async function listNotifications(
  db: NotificationDb,
  userId: string,
  filters?: NotificationFilters,
): Promise<Notification[]> {
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (filters?.read !== undefined) {
    conditions.push(`read = $${paramIdx}`);
    params.push(filters.read);
    paramIdx++;
  }

  if (filters?.type !== undefined) {
    conditions.push(`type = $${paramIdx}`);
    params.push(filters.type);
    paramIdx++;
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const sql = `
    SELECT id, user_id AS "userId", type, title, body, conversation_id AS "conversationId",
           read, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM notifications
    WHERE ${conditions.join(' AND ')}
    ORDER BY read ASC, created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;

  params.push(limit, offset);
  return db.query<Notification>(sql, params);
}

export async function markAsRead(
  db: NotificationDb,
  notificationId: string,
): Promise<boolean> {
  const result = await db.execute(
    `UPDATE notifications SET read = true, updated_at = $2 WHERE id = $1`,
    [notificationId, new Date()],
  );
  return result.rowCount > 0;
}

export async function markAllAsRead(
  db: NotificationDb,
  userId: string,
): Promise<number> {
  const result = await db.execute(
    `UPDATE notifications SET read = true, updated_at = $2 WHERE user_id = $1 AND read = false`,
    [userId, new Date()],
  );
  return result.rowCount;
}

export async function getUnreadCount(
  db: NotificationDb,
  userId: string,
): Promise<number> {
  const rows = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read = false`,
    [userId],
  );
  return rows[0]?.count ?? 0;
}

export async function deleteNotification(
  db: NotificationDb,
  id: string,
): Promise<boolean> {
  const result = await db.execute(
    `DELETE FROM notifications WHERE id = $1`,
    [id],
  );
  return result.rowCount > 0;
}
