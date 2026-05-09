import { describe, it, expect, vi } from 'vitest';
import { getSettings, updateSettings, type NotificationSettingsDb } from '../src/data/notification-settings.js';

function mockSettingsDb(overrides: Partial<NotificationSettingsDb> = {}): NotificationSettingsDb {
  return {
    query: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ rowCount: 0 }),
    ...overrides,
  };
}

describe('getSettings', () => {
  it('returns stored settings when they exist', async () => {
    const stored = {
      id: 's-1',
      userId: 'u-1',
      emailEnabled: false,
      pushEnabled: true,
      settings: { new_message: true, assignment: false, mention: true, status_change: true, escalation: false },
    };
    const db = mockSettingsDb({ query: vi.fn().mockResolvedValue([stored]) });
    const result = await getSettings(db, 'u-1');
    expect(result).toEqual(stored);
    expect(result.emailEnabled).toBe(false);
    expect(result.settings.assignment).toBe(false);
  });

  it('returns defaults when no settings exist', async () => {
    const db = mockSettingsDb();
    const result = await getSettings(db, 'u-new');
    expect(result.userId).toBe('u-new');
    expect(result.emailEnabled).toBe(true);
    expect(result.pushEnabled).toBe(true);
    expect(result.settings.new_message).toBe(true);
    expect(result.settings.assignment).toBe(true);
    expect(result.settings.mention).toBe(true);
    expect(result.settings.status_change).toBe(true);
    expect(result.settings.escalation).toBe(true);
  });

  it('default settings object is not shared between calls', async () => {
    const db = mockSettingsDb();
    const result1 = await getSettings(db, 'u-1');
    const result2 = await getSettings(db, 'u-2');
    result1.settings.new_message = false;
    expect(result2.settings.new_message).toBe(true);
  });
});

describe('updateSettings', () => {
  it('calls upsert with provided values', async () => {
    const returned = {
      id: 's-1',
      userId: 'u-1',
      emailEnabled: false,
      pushEnabled: true,
      settings: { new_message: true, assignment: true, mention: true, status_change: true, escalation: true },
    };
    const db = mockSettingsDb({ query: vi.fn().mockResolvedValue([returned]) });
    const result = await updateSettings(db, 'u-1', { emailEnabled: false });
    expect(result.emailEnabled).toBe(false);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('uses defaults for omitted fields', async () => {
    const returned = {
      id: 's-1',
      userId: 'u-1',
      emailEnabled: true,
      pushEnabled: true,
      settings: { new_message: true, assignment: true, mention: true, status_change: true, escalation: true },
    };
    const db = mockSettingsDb({ query: vi.fn().mockResolvedValue([returned]) });
    const result = await updateSettings(db, 'u-1', {});
    expect(result.emailEnabled).toBe(true);
    expect(result.pushEnabled).toBe(true);
  });

  it('passes null for omitted fields so existing settings are preserved on conflict', async () => {
    const returned = {
      id: 's-1',
      userId: 'u-1',
      emailEnabled: false,
      pushEnabled: false,
      settings: { new_message: false, assignment: true, mention: true, status_change: true, escalation: true },
    };
    const query = vi.fn().mockResolvedValue([returned]);
    const db = mockSettingsDb({ query });

    await updateSettings(db, 'u-1', { settings: { assignment: false } });

    const params = query.mock.calls[0]?.[1] as unknown[];
    expect(params[2]).toBeNull();
    expect(params[3]).toBeNull();
    expect(params[4]).toBe(JSON.stringify({ assignment: false }));
  });
});
