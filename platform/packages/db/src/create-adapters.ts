import type { Db } from './client.js';

/**
 * Factory that creates module-specific DB adapters from a Drizzle instance.
 *
 * Usage in app bootstrap:
 * ```ts
 * import { db } from '@buildpass/db';
 * import { createAdapters } from '@buildpass/db/adapters';
 *
 * const adapters = createAdapters(db);
 * // Pass adapters.identity to identity module routes
 * // Pass adapters.conversations to conversations module routes
 * ```
 *
 * Each adapter implements the interface expected by its module's data layer.
 * This is the integration point between the DB package and all modules.
 */
export function createAdapters(db: Db) {
  return {
    db,

    identity: {
      db,
      // Implements UserDb + PermissionDb interfaces
      // Wire: findByEmail, findByClerkId, findByApiKeyHash, etc.
    },

    conversations: {
      db,
      // Implements conversations data layer (CRUD, messages, participants, events)
      // Wire: createConversation, listConversations, createMessage, etc.
    },

    channels: {
      db,
      // Implements channel CRUD
      // Wire: createChannel, listChannels, etc.
    },

    routing: {
      db,
      // Implements RoutingDb interface
      // Wire: listRoutingRules, createRoutingRule, getTeamMembers, etc.
    },

    agents: {
      db,
      // Implements agent data layer
      // Wire: registerAgent, getAgentConfig, etc.
    },

    knowledgeBase: {
      db,
      // Implements KB data layer
      // Wire: createPortal, createArticle, getArticleBySlug, etc.
    },

    notifications: {
      db,
      // Implements NotificationDb + NotificationSettingsDb
      // Wire: createNotification, getSettings, etc.
    },

    analytics: {
      db,
      // Implements MetricsDb + SlaDb via Drizzle (replaces raw SQL)
      // Wire: getConversationMetrics, checkSlaBreaches, etc.
    },
  };
}

export type Adapters = ReturnType<typeof createAdapters>;
