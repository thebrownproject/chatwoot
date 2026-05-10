import { describe, it, expect } from 'vitest';
import { getTableName, getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';

// Schema barrel import — verifies re-export works
import * as schema from '../schema/index.js';

// Direct module imports for relation checks
import { usersRelations } from '../schema/users.js';
import { permissionsRelations } from '../schema/permissions.js';
import {
  conversationsRelations,
  conversationParticipantsRelations,
} from '../schema/conversations.js';
import { messagesRelations } from '../schema/messages.js';
import { conversationEventsRelations } from '../schema/conversations.js';
import {
  labelsRelations,
  conversationLabelsRelations,
} from '../schema/labels.js';
import { cannedResponsesRelations } from '../schema/canned-responses.js';
import {
  channelsRelations,
  channelConversationsRelations,
} from '../schema/channels.js';
import {
  teamsRelations,
  teamMembersRelations,
} from '../schema/teams.js';
import { routingRulesRelations } from '../schema/routing-rules.js';
import {
  notificationsRelations,
  notificationSettingsRelations,
} from '../schema/notifications.js';
import {
  portalsRelations,
  categoriesRelations,
  articlesRelations,
} from '../schema/knowledge-base.js';

// ── Table exports ──

describe('schema barrel export', () => {
  it('exports all table objects', () => {
    const expectedTables = [
      'users',
      'permissions',
      'conversations',
      'conversationParticipants',
      'messages',
      'conversationEvents',
      'labels',
      'conversationLabels',
      'cannedResponses',
      'channels',
      'channelConversations',
      'teams',
      'teamMembers',
      'routingRules',
      'notifications',
      'notificationSettings',
      'portals',
      'categories',
      'articles',
    ];

    for (const name of expectedTables) {
      expect(schema).toHaveProperty(name);
    }
  });

  it('exports all enum definitions', () => {
    const expectedEnums = [
      'userTypeEnum',
      'roleEnum',
      'conversationStatusEnum',
      'channelOriginEnum',
      'priorityEnum',
      'participantRoleEnum',
      'messageTypeEnum',
      'visibilityEnum',
      'channelTypeEnum',
      'teamMemberRoleEnum',
      'routingActionEnum',
      'routingTargetTypeEnum',
      'notificationTypeEnum',
      'articleStatusEnum',
    ];

    for (const name of expectedEnums) {
      expect(schema).toHaveProperty(name);
    }
  });

  it('exports all relation definitions', () => {
    const expectedRelations = [
      'usersRelations',
      'permissionsRelations',
      'conversationsRelations',
      'conversationParticipantsRelations',
      'messagesRelations',
      'conversationEventsRelations',
      'labelsRelations',
      'conversationLabelsRelations',
      'cannedResponsesRelations',
      'channelsRelations',
      'channelConversationsRelations',
      'teamsRelations',
      'teamMembersRelations',
      'notificationsRelations',
      'notificationSettingsRelations',
      'portalsRelations',
      'categoriesRelations',
      'articlesRelations',
    ];

    for (const name of expectedRelations) {
      expect(schema).toHaveProperty(name);
    }
  });
});

// ── Enum values ──

describe('enum values', () => {
  it('userTypeEnum has correct values', () => {
    expect(schema.userTypeEnum.enumValues).toEqual([
      'human_agent',
      'ai_agent',
      'contact',
      'system',
    ]);
  });

  it('roleEnum has correct values', () => {
    expect(schema.roleEnum.enumValues).toEqual([
      'admin',
      'agent',
      'contact',
      'bot',
    ]);
  });

  it('conversationStatusEnum has correct values', () => {
    expect(schema.conversationStatusEnum.enumValues).toEqual([
      'open',
      'pending',
      'snoozed',
      'resolved',
    ]);
  });

  it('channelOriginEnum has correct values', () => {
    expect(schema.channelOriginEnum.enumValues).toEqual([
      'email',
      'web_chat',
      'sms',
      'slack',
      'in_app',
    ]);
  });

  it('priorityEnum has correct values', () => {
    expect(schema.priorityEnum.enumValues).toEqual([
      'low',
      'medium',
      'high',
      'urgent',
    ]);
  });

  it('participantRoleEnum has correct values', () => {
    expect(schema.participantRoleEnum.enumValues).toEqual([
      'contact',
      'assignee',
      'observer',
      'copilot',
    ]);
  });

  it('messageTypeEnum has correct values', () => {
    expect(schema.messageTypeEnum.enumValues).toEqual([
      'text',
      'rich',
      'activity',
    ]);
  });

  it('visibilityEnum has correct values', () => {
    expect(schema.visibilityEnum.enumValues).toEqual(['public', 'internal']);
  });

  it('channelTypeEnum has correct values', () => {
    expect(schema.channelTypeEnum.enumValues).toEqual([
      'email',
      'web_chat',
      'sms',
      'slack',
      'in_app',
    ]);
  });

  it('teamRoleEnum has correct values', () => {
    expect(schema.teamRoleEnum.enumValues).toEqual(['lead', 'member']);
  });

  it('routingActionEnum has correct values', () => {
    expect(schema.routingActionEnum.enumValues).toEqual([
      'assign_agent',
      'assign_team',
      'assign_bot',
    ]);
  });

  it('routingTargetTypeEnum has correct values', () => {
    expect(schema.routingTargetTypeEnum.enumValues).toEqual(['user', 'team']);
  });
});

// ── Required columns ──

describe('required columns', () => {
  it('users table has required columns', () => {
    const cols = getTableColumns(schema.users);
    expect(cols.id).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.metadata).toBeDefined();
    expect(cols.clerkId).toBeDefined();
    expect(cols.apiKeyHash).toBeDefined();
    expect(cols.apiKeyLookupHash).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();

    // notNull checks
    expect(cols.type.notNull).toBe(true);
    expect(cols.name.notNull).toBe(true);
    // email is nullable
    expect(cols.email.notNull).toBe(false);
  });

  it('conversations table has required columns', () => {
    const cols = getTableColumns(schema.conversations);
    expect(cols.id).toBeDefined();
    expect(cols.displayId).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.channelOrigin).toBeDefined();
    expect(cols.assigneeId).toBeDefined();
    expect(cols.subject).toBeDefined();
    expect(cols.priority).toBeDefined();
    expect(cols.snoozedUntil).toBeDefined();
    expect(cols.firstReplyAt).toBeDefined();
    expect(cols.resolvedAt).toBeDefined();
    expect(cols.metadata).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();

    // status and channelOrigin are required
    expect(cols.status.notNull).toBe(true);
    expect(cols.channelOrigin.notNull).toBe(true);
    // assigneeId is nullable
    expect(cols.assigneeId.notNull).toBe(false);
  });

  it('messages table has required columns', () => {
    const cols = getTableColumns(schema.messages);
    expect(cols.id).toBeDefined();
    expect(cols.conversationId).toBeDefined();
    expect(cols.senderId).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.visibility).toBeDefined();
    expect(cols.body).toBeDefined();
    expect(cols.bodyHtml).toBeDefined();
    expect(cols.metadata).toBeDefined();
    expect(cols.attachments).toBeDefined();

    expect(cols.conversationId.notNull).toBe(true);
    expect(cols.senderId.notNull).toBe(true);
    expect(cols.body.notNull).toBe(true);
  });

  it('channels table has required columns', () => {
    const cols = getTableColumns(schema.channels);
    expect(cols.id).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.config).toBeDefined();
    expect(cols.active).toBeDefined();

    expect(cols.type.notNull).toBe(true);
    expect(cols.name.notNull).toBe(true);
    expect(cols.active.notNull).toBe(true);
  });

  it('labels table has required columns', () => {
    const cols = getTableColumns(schema.labels);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.color).toBeDefined();
    expect(cols.name.notNull).toBe(true);
  });

  it('teams table has required columns', () => {
    const cols = getTableColumns(schema.teams);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
    expect(cols.name.notNull).toBe(true);
    expect(cols.createdAt.notNull).toBe(true);
    expect(cols.updatedAt.notNull).toBe(true);
  });

  it('teamMembers table has required columns', () => {
    const cols = getTableColumns(schema.teamMembers);
    expect(cols.teamId).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.role).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.teamId.notNull).toBe(true);
    expect(cols.userId.notNull).toBe(true);
    expect(cols.role.notNull).toBe(true);
    expect(cols.createdAt.notNull).toBe(true);
  });
});

// ── Table names ──

describe('table names map to Postgres', () => {
  it('uses correct Postgres table names', () => {
    expect(getTableName(schema.users)).toBe('users');
    expect(getTableName(schema.permissions)).toBe('permissions');
    expect(getTableName(schema.conversations)).toBe('conversations');
    expect(getTableName(schema.conversationParticipants)).toBe(
      'conversation_participants',
    );
    expect(getTableName(schema.messages)).toBe('messages');
    expect(getTableName(schema.conversationEvents)).toBe(
      'conversation_events',
    );
    expect(getTableName(schema.labels)).toBe('labels');
    expect(getTableName(schema.conversationLabels)).toBe(
      'conversation_labels',
    );
    expect(getTableName(schema.cannedResponses)).toBe('canned_responses');
    expect(getTableName(schema.channels)).toBe('channels');
    expect(getTableName(schema.channelConversations)).toBe(
      'channel_conversations',
    );
    expect(getTableName(schema.teams)).toBe('teams');
    expect(getTableName(schema.teamMembers)).toBe('team_members');
    expect(getTableName(schema.routingRules)).toBe('routing_rules');
    expect(getTableName(schema.notifications)).toBe('notifications');
    expect(getTableName(schema.notificationSettings)).toBe(
      'notification_settings',
    );
    expect(getTableName(schema.portals)).toBe('portals');
    expect(getTableName(schema.categories)).toBe('categories');
    expect(getTableName(schema.articles)).toBe('articles');
  });
});

// ── Relations ──

describe('relations are configured', () => {
  it('usersRelations is a valid relation config', () => {
    expect(usersRelations).toBeDefined();
    expect(usersRelations.table).toBe(schema.users);
  });

  it('permissionsRelations references users', () => {
    expect(permissionsRelations).toBeDefined();
    expect(permissionsRelations.table).toBe(schema.permissions);
  });

  it('conversationsRelations references users', () => {
    expect(conversationsRelations).toBeDefined();
    expect(conversationsRelations.table).toBe(schema.conversations);
  });

  it('conversationParticipantsRelations references both tables', () => {
    expect(conversationParticipantsRelations).toBeDefined();
    expect(conversationParticipantsRelations.table).toBe(
      schema.conversationParticipants,
    );
  });

  it('messagesRelations references conversations and users', () => {
    expect(messagesRelations).toBeDefined();
    expect(messagesRelations.table).toBe(schema.messages);
  });

  it('conversationEventsRelations references conversations and users', () => {
    expect(conversationEventsRelations).toBeDefined();
    expect(conversationEventsRelations.table).toBe(schema.conversationEvents);
  });

  it('labelsRelations is configured', () => {
    expect(labelsRelations).toBeDefined();
    expect(labelsRelations.table).toBe(schema.labels);
  });

  it('conversationLabelsRelations references both tables', () => {
    expect(conversationLabelsRelations).toBeDefined();
    expect(conversationLabelsRelations.table).toBe(schema.conversationLabels);
  });

  it('cannedResponsesRelations references users', () => {
    expect(cannedResponsesRelations).toBeDefined();
    expect(cannedResponsesRelations.table).toBe(schema.cannedResponses);
  });

  it('channelsRelations is configured', () => {
    expect(channelsRelations).toBeDefined();
    expect(channelsRelations.table).toBe(schema.channels);
  });

  it('channelConversationsRelations references both tables', () => {
    expect(channelConversationsRelations).toBeDefined();
    expect(channelConversationsRelations.table).toBe(
      schema.channelConversations,
    );
  });

  it('teamsRelations is configured', () => {
    expect(teamsRelations).toBeDefined();
    expect(teamsRelations.table).toBe(schema.teams);
  });

  it('teamMembersRelations references both tables', () => {
    expect(teamMembersRelations).toBeDefined();
    expect(teamMembersRelations.table).toBe(schema.teamMembers);
  });

  it('routingRulesRelations is configured', () => {
    expect(routingRulesRelations).toBeDefined();
    expect(routingRulesRelations.table).toBe(schema.routingRules);
  });

  it('notificationsRelations references users', () => {
    expect(notificationsRelations).toBeDefined();
    expect(notificationsRelations.table).toBe(schema.notifications);
  });

  it('notificationSettingsRelations references users', () => {
    expect(notificationSettingsRelations).toBeDefined();
    expect(notificationSettingsRelations.table).toBe(schema.notificationSettings);
  });

  it('portalsRelations is configured', () => {
    expect(portalsRelations).toBeDefined();
    expect(portalsRelations.table).toBe(schema.portals);
  });

  it('categoriesRelations references portals', () => {
    expect(categoriesRelations).toBeDefined();
    expect(categoriesRelations.table).toBe(schema.categories);
  });

  it('articlesRelations references portals and users', () => {
    expect(articlesRelations).toBeDefined();
    expect(articlesRelations.table).toBe(schema.articles);
  });
});

// ── Indexes ──

describe('indexes', () => {
  it('users table has indexes', () => {
    const config = getTableConfig(schema.users);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_users_email');
    expect(indexNames).toContain('idx_users_clerk_id');
    expect(indexNames).toContain('idx_users_type');
  });

  it('permissions table enforces one permission record per user', () => {
    const config = getTableConfig(schema.permissions);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_permissions_user_id');
  });

  it('conversations table has indexes', () => {
    const config = getTableConfig(schema.conversations);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_conversations_status');
    expect(indexNames).toContain('idx_conversations_assignee_id');
    expect(indexNames).toContain('idx_conversations_display_id');
    expect(indexNames).toContain('idx_conversations_search');
  });

  it('messages table has indexes', () => {
    const config = getTableConfig(schema.messages);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_messages_conversation_id');
    expect(indexNames).toContain('idx_messages_sender_id');
    expect(indexNames).toContain('idx_messages_search');
  });

  it('channels table has type index', () => {
    const config = getTableConfig(schema.channels);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_channels_type');
  });

  it('notifications table has indexes', () => {
    const config = getTableConfig(schema.notifications);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_notifications_user_id');
    expect(indexNames).toContain('idx_notifications_user_unread');
  });

  it('portals table has slug unique index', () => {
    const config = getTableConfig(schema.portals);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_portals_slug');
  });

  it('articles table has indexes', () => {
    const config = getTableConfig(schema.articles);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_articles_portal_id');
    expect(indexNames).toContain('idx_articles_category_id');
    expect(indexNames).toContain('idx_articles_portal_slug');
    expect(indexNames).toContain('idx_articles_search');
  });

  it('categories table has indexes', () => {
    const config = getTableConfig(schema.categories);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain('idx_categories_portal_id');
    expect(indexNames).toContain('idx_categories_portal_slug');
  });

  it('users email index is unique', () => {
    const config = getTableConfig(schema.users);
    const emailIdx = config.indexes.find((i) => i.config.name === 'idx_users_email');
    expect(emailIdx).toBeDefined();
    expect(emailIdx!.config.unique).toBe(true);
  });

  it('routingRules conditions column is notNull', () => {
    const cols = getTableColumns(schema.routingRules);
    expect(cols.conditions.notNull).toBe(true);
  });
});
