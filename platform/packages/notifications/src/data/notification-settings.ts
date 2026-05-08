import type {
  NotificationSettings,
  NotificationTypeSettings,
  UpdateSettingsData,
} from '../types.js';

export interface NotificationSettingsDb {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
}

const DEFAULT_TYPE_SETTINGS: NotificationTypeSettings = {
  new_message: true,
  assignment: true,
  mention: true,
  status_change: true,
  escalation: true,
};

export async function getSettings(
  db: NotificationSettingsDb,
  userId: string,
): Promise<NotificationSettings> {
  const rows = await db.query<NotificationSettings>(
    `SELECT id, user_id AS "userId", email_enabled AS "emailEnabled", push_enabled AS "pushEnabled",
            settings
     FROM notification_settings
     WHERE user_id = $1`,
    [userId],
  );

  if (rows[0]) return rows[0];

  // Return defaults if no settings exist yet
  return {
    id: '',
    userId,
    emailEnabled: true,
    pushEnabled: true,
    settings: { ...DEFAULT_TYPE_SETTINGS },
  };
}

export async function updateSettings(
  db: NotificationSettingsDb,
  userId: string,
  data: UpdateSettingsData,
): Promise<NotificationSettings> {
  const now = new Date();

  // Upsert: insert or update on conflict
  const rows = await db.query<NotificationSettings>(
    `INSERT INTO notification_settings (id, user_id, email_enabled, push_enabled, settings, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       email_enabled = COALESCE($3, notification_settings.email_enabled),
       push_enabled = COALESCE($4, notification_settings.push_enabled),
       settings = COALESCE($5, notification_settings.settings),
       updated_at = $7
     RETURNING id, user_id AS "userId", email_enabled AS "emailEnabled", push_enabled AS "pushEnabled", settings`,
    [
      crypto.randomUUID(),
      userId,
      data.emailEnabled ?? true,
      data.pushEnabled ?? true,
      JSON.stringify(data.settings ?? DEFAULT_TYPE_SETTINGS),
      now,
      now,
    ],
  );

  return rows[0]!;
}
