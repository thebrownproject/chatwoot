/**
 * E2E test platform setup.
 *
 * Wires all modules together with in-memory stores, providing a complete
 * Platform instance for integration testing without a database.
 */

import {
  createConversation,
  getConversationById,
  listConversations,
  updateConversation,
  resolveConversation,
  reopenConversation,
  pendConversation,
  snoozeConversation,
  unsnoozeConversation,
  getConversationEvents,
  _resetStore as resetConversationStore,
} from '../../packages/conversations/src/data/conversations.js';
import {
  assignConversation,
  unassignConversation,
} from '../../packages/conversations/src/data/assignment.js';
import { validateTransition, allowedTransitions } from '../../packages/conversations/src/data/status-machine.js';

import {
  createSuggestion,
  generateSuggestion,
  acceptSuggestion,
  dismissSuggestion,
  listPendingSuggestions,
  _resetCopilotStore,
} from '../../packages/agents/src/copilot.js';
import {
  requestHandoff,
  handoffToAgent,
  handoffAgentToAgent,
  _resetHandoffStore,
  _seedAssignment,
  _getHandoffEvents,
  _getHandoffs,
} from '../../packages/agents/src/handoff.js';
import {
  registerAgent,
  getAgentConfig,
  listAgents,
  updateAgentConfig,
  _resetStore as resetAgentStore,
} from '../../packages/agents/src/data/agents.js';

import {
  createPortal,
  getPortalById,
  getPortalBySlug,
  listPortals,
  updatePortal,
  clearPortalStore,
} from '../../packages/knowledge-base/src/data/portals.js';
import {
  createCategory,
  getCategoryById,
  listCategoriesByPortal,
  listSubCategories,
  updateCategory,
  deleteCategory,
  clearCategoryStore,
} from '../../packages/knowledge-base/src/data/categories.js';
import {
  createArticle,
  getArticleById,
  getArticleBySlug,
  listArticlesByPortal,
  updateArticle,
  deleteArticle,
  publishArticle,
  archiveArticle,
  incrementViewCount,
  searchArticles,
  clearArticleStore,
} from '../../packages/knowledge-base/src/data/articles.js';

import {
  evaluate,
  matchConditions,
} from '../../packages/routing/src/engine/evaluator.js';
import {
  executeAction,
  roundRobin,
  resetRoundRobin,
} from '../../packages/routing/src/engine/assigner.js';

import { EventBus } from '../../packages/core/src/event-bus.js';
import { onConversationEvent } from '../../packages/core/src/hooks/conversation-hooks.js';
import { onMessageCreated } from '../../packages/core/src/hooks/message-hooks.js';
import type { HookDb, HookMessage, HookConversation, HookConversationEvent, EventMap } from '../../packages/core/src/types.js';
import type { Conversation, ConversationCreate, DbClient } from '../../packages/conversations/src/types.js';
import type { Db as ConversationDb } from '../../packages/conversations/src/data/db.js';
import type { ConversationEvent, ConversationEventCreate, EventType } from '../../packages/conversations/src/types/events.js';
import type { ConversationParticipant, ParticipantRole, ParticipantWithUser } from '../../packages/conversations/src/types/participants.js';
import type { AgentConfig, AgentConfigCreate, CopilotSuggestion, HandoffRequest } from '../../packages/agents/src/types.js';
import type { RoutableConversation, RoutingRule, RoutingDb } from '../../packages/routing/src/types.js';
import type { PortalRecord, CategoryRecord, ArticleRecord } from '../../packages/knowledge-base/src/types.js';

// ---------------------------------------------------------------------------
// Stub DbClient for modules that need one
// ---------------------------------------------------------------------------

export function createStubDb(): DbClient {
  return {
    query: null,
    execute: async () => ({}),
  };
}

function createConversationAssignmentDb(db: DbClient): ConversationDb {
  const participants: ConversationParticipant[] = [];
  const events: ConversationEvent[] = [];

  return {
    participants: {
      async add(conversationId, userId, role) {
        const participant: ConversationParticipant = {
          id: crypto.randomUUID(),
          conversationId,
          userId,
          role,
          joinedAt: new Date(),
          leftAt: null,
        };
        participants.push(participant);
        return participant;
      },
      async remove(conversationId, userId) {
        const participant = participants.find(
          (p) => p.conversationId === conversationId && p.userId === userId && p.leftAt === null,
        );
        if (participant) participant.leftAt = new Date();
      },
      async list(conversationId): Promise<ParticipantWithUser[]> {
        return participants
          .filter((p) => p.conversationId === conversationId && p.leftAt === null)
          .map((p) => ({
            ...p,
            user: getTestUser(p.userId) ?? {
              id: p.userId,
              name: 'Unknown',
              email: null,
              type: 'human_agent',
            },
          }));
      },
      async getRole(conversationId, userId): Promise<ParticipantRole | null> {
        return participants.find(
          (p) => p.conversationId === conversationId && p.userId === userId && p.leftAt === null,
        )?.role ?? null;
      },
      async updateRole(conversationId, userId, role) {
        const participant = participants.find(
          (p) => p.conversationId === conversationId && p.userId === userId && p.leftAt === null,
        );
        if (participant) participant.role = role;
      },
      async exists(conversationId, userId) {
        return participants.some(
          (p) => p.conversationId === conversationId && p.userId === userId && p.leftAt === null,
        );
      },
    },
    conversations: {
      async setAssignee(conversationId, assigneeId) {
        const conversation = await getConversationById(db, conversationId);
        if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

        conversation.assigneeId = assigneeId;
        conversation.updatedAt = new Date();
      },
      async getAssignee(conversationId) {
        const conversation = await getConversationById(db, conversationId);
        if (!conversation?.assigneeId) return null;

        const user = getTestUser(conversation.assigneeId);
        return user
          ? { id: user.id, name: user.name, email: user.email ?? null, type: user.type }
          : null;
      },
      async listAssigned(userId, filters) {
        const result = await listConversations(db, {
          status: filters?.status,
          priority: filters?.priority,
          assigneeId: userId,
          limit: filters?.limit,
          offset: filters?.offset,
        });
        return result.data;
      },
      async listUnassigned(filters) {
        const result = await listConversations(db, {
          status: filters?.status,
          priority: filters?.priority,
          limit: filters?.limit,
          offset: filters?.offset,
        });
        return result.data.filter((conversation) => conversation.assigneeId === null);
      },
    },
    events: {
      async create(data: ConversationEventCreate): Promise<ConversationEvent> {
        const event: ConversationEvent = {
          id: crypto.randomUUID(),
          conversationId: data.conversationId,
          actorId: data.actorId,
          eventType: data.eventType,
          payload: data.payload ?? {},
          createdAt: new Date(),
        };
        events.push(event);
        return event;
      },
      async list(conversationId) {
        return events.filter((event) => event.conversationId === conversationId);
      },
      async listByType(conversationId, eventType: EventType) {
        return events.filter(
          (event) => event.conversationId === conversationId && event.eventType === eventType,
        );
      },
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory user store for tests
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  type: 'human_agent' | 'ai_agent' | 'contact' | 'system';
  name: string;
  email?: string;
}

const userStore = new Map<string, TestUser>();

export function createTestUser(data: Omit<TestUser, 'id'> & { id?: string }): TestUser {
  const user: TestUser = {
    id: data.id ?? crypto.randomUUID(),
    type: data.type,
    name: data.name,
    email: data.email,
  };
  userStore.set(user.id, user);
  return user;
}

export function getTestUser(id: string): TestUser | undefined {
  return userStore.get(id);
}

// ---------------------------------------------------------------------------
// In-memory notification store for tests
// ---------------------------------------------------------------------------

export interface TestNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  conversationId: string | null;
  read: boolean;
  createdAt: Date;
}

const notificationStore: TestNotification[] = [];

export function createTestNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  conversationId?: string;
}): TestNotification {
  const notification: TestNotification = {
    id: crypto.randomUUID(),
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    conversationId: data.conversationId ?? null,
    read: false,
    createdAt: new Date(),
  };
  notificationStore.push(notification);
  return notification;
}

export function getNotificationsForUser(userId: string): TestNotification[] {
  return notificationStore.filter((n) => n.userId === userId);
}

// ---------------------------------------------------------------------------
// In-memory notification settings
// ---------------------------------------------------------------------------

interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  settings: Record<string, boolean>;
}

const settingsStore = new Map<string, NotificationSettings>();

export function setNotificationSettings(userId: string, settings: Partial<NotificationSettings>): void {
  const existing = settingsStore.get(userId) ?? {
    userId,
    emailEnabled: true,
    pushEnabled: true,
    settings: {},
  };
  settingsStore.set(userId, { ...existing, ...settings });
}

export function getNotificationSettings(userId: string): NotificationSettings {
  return settingsStore.get(userId) ?? {
    userId,
    emailEnabled: true,
    pushEnabled: true,
    settings: {},
  };
}

// ---------------------------------------------------------------------------
// In-memory metrics store
// ---------------------------------------------------------------------------

export interface ConversationMetrics {
  total: number;
  byStatus: Record<string, number>;
  avgFirstReplyMs: number | null;
  avgResolutionMs: number | null;
}

export function computeMetrics(conversations: Conversation[]): ConversationMetrics {
  const byStatus: Record<string, number> = {};
  let firstReplySum = 0;
  let firstReplyCount = 0;
  let resolutionSum = 0;
  let resolutionCount = 0;

  for (const c of conversations) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;

    if (c.firstReplyAt) {
      firstReplySum += c.firstReplyAt.getTime() - c.createdAt.getTime();
      firstReplyCount++;
    }
    if (c.resolvedAt) {
      resolutionSum += c.resolvedAt.getTime() - c.createdAt.getTime();
      resolutionCount++;
    }
  }

  return {
    total: conversations.length,
    byStatus,
    avgFirstReplyMs: firstReplyCount > 0 ? firstReplySum / firstReplyCount : null,
    avgResolutionMs: resolutionCount > 0 ? resolutionSum / resolutionCount : null,
  };
}

// ---------------------------------------------------------------------------
// SLA check helper
// ---------------------------------------------------------------------------

export interface SlaBreach {
  conversationId: string;
  type: 'first_reply' | 'resolution';
  thresholdMs: number;
  actualMs: number;
}

export function checkSla(
  conversations: Conversation[],
  thresholds: { firstReplyMs: number; resolutionMs: number },
): SlaBreach[] {
  const now = new Date();
  const breaches: SlaBreach[] = [];

  for (const c of conversations) {
    // First reply breach: no reply and open too long
    if (!c.firstReplyAt && c.status !== 'resolved') {
      const elapsed = now.getTime() - c.createdAt.getTime();
      if (elapsed > thresholds.firstReplyMs) {
        breaches.push({
          conversationId: c.id,
          type: 'first_reply',
          thresholdMs: thresholds.firstReplyMs,
          actualMs: elapsed,
        });
      }
    }

    // Resolution breach: not resolved and open too long
    if (!c.resolvedAt && c.status !== 'resolved') {
      const elapsed = now.getTime() - c.createdAt.getTime();
      if (elapsed > thresholds.resolutionMs) {
        breaches.push({
          conversationId: c.id,
          type: 'resolution',
          thresholdMs: thresholds.resolutionMs,
          actualMs: elapsed,
        });
      }
    }
  }

  return breaches;
}

// ---------------------------------------------------------------------------
// In-memory routing DB adapter
// ---------------------------------------------------------------------------

const routingAssignments = new Map<string, string>();
const teams = new Map<string, { id: string; name: string; members: Array<{ userId: string; role: 'lead' | 'member'; createdAt: Date }> }>();

export function createRoutingDb(): RoutingDb {
  return {
    async listRoutingRules() { return []; },
    async getRoutingRule() { return null; },
    async createRoutingRule(data) { return { ...data, id: crypto.randomUUID(), active: data.active ?? true, createdAt: new Date(), updatedAt: new Date() }; },
    async updateRoutingRule() { return null; },
    async deleteRoutingRule() { return false; },
    async listTeams() { return [...teams.values()].map(t => ({ id: t.id, name: t.name, createdAt: new Date(), updatedAt: new Date() })); },
    async getTeam(id) { const t = teams.get(id); return t ? { id: t.id, name: t.name, createdAt: new Date(), updatedAt: new Date() } : null; },
    async createTeam(data) { const id = crypto.randomUUID(); teams.set(id, { id, name: data.name, members: [] }); return { id, name: data.name, createdAt: new Date(), updatedAt: new Date() }; },
    async deleteTeam(id) { return teams.delete(id); },
    async getTeamMembers(teamId) {
      const team = teams.get(teamId);
      return team?.members.map(m => ({ teamId, userId: m.userId, role: m.role, createdAt: m.createdAt })) ?? [];
    },
    async addTeamMember(teamId, userId, role) {
      const team = teams.get(teamId);
      if (!team) throw new Error(`Team ${teamId} not found`);
      const member = { userId, role, createdAt: new Date() };
      team.members.push(member);
      return { teamId, ...member };
    },
    async removeTeamMember(teamId, userId) {
      const team = teams.get(teamId);
      if (!team) return false;
      const idx = team.members.findIndex(m => m.userId === userId);
      if (idx === -1) return false;
      team.members.splice(idx, 1);
      return true;
    },
    async getSnoozedConversationsDue() { return []; },
    async updateConversationStatus() {},
    async assignConversation(conversationId, assigneeId) { routingAssignments.set(conversationId, assigneeId); },
  };
}

export function getRoutingAssignment(conversationId: string): string | undefined {
  return routingAssignments.get(conversationId);
}

// ---------------------------------------------------------------------------
// Platform: wires all modules
// ---------------------------------------------------------------------------

export interface Platform {
  db: DbClient;
  routingDb: RoutingDb;

  // Conversations
  conversations: {
    create: typeof createConversation;
    getById: typeof getConversationById;
    list: typeof listConversations;
    update: typeof updateConversation;
    assign: (
      db: DbClient,
      conversationId: string,
      assigneeId: string,
      actorId: string,
    ) => Promise<Conversation | undefined>;
    unassign: (
      db: DbClient,
      conversationId: string,
      actorId: string,
    ) => Promise<Conversation | undefined>;
    resolve: typeof resolveConversation;
    reopen: typeof reopenConversation;
    pend: typeof pendConversation;
    snooze: typeof snoozeConversation;
    unsnooze: typeof unsnoozeConversation;
    getEvents: typeof getConversationEvents;
    validateTransition: typeof validateTransition;
    allowedTransitions: typeof allowedTransitions;
  };

  // Agents
  agents: {
    register: typeof registerAgent;
    getConfig: typeof getAgentConfig;
    list: typeof listAgents;
    updateConfig: typeof updateAgentConfig;
    copilot: {
      createSuggestion: typeof createSuggestion;
      generateSuggestion: typeof generateSuggestion;
      accept: typeof acceptSuggestion;
      dismiss: typeof dismissSuggestion;
      listPending: typeof listPendingSuggestions;
    };
    handoff: {
      requestHandoff: typeof requestHandoff;
      toAgent: typeof handoffToAgent;
      agentToAgent: typeof handoffAgentToAgent;
      getEvents: typeof _getHandoffEvents;
      getHandoffs: typeof _getHandoffs;
      seedAssignment: typeof _seedAssignment;
    };
  };

  // Knowledge base
  knowledgeBase: {
    portals: {
      create: typeof createPortal;
      getById: typeof getPortalById;
      getBySlug: typeof getPortalBySlug;
      list: typeof listPortals;
      update: typeof updatePortal;
    };
    categories: {
      create: typeof createCategory;
      getById: typeof getCategoryById;
      listByPortal: typeof listCategoriesByPortal;
      listSubCategories: typeof listSubCategories;
      update: typeof updateCategory;
      delete: typeof deleteCategory;
    };
    articles: {
      create: typeof createArticle;
      getById: typeof getArticleById;
      getBySlug: typeof getArticleBySlug;
      listByPortal: typeof listArticlesByPortal;
      update: typeof updateArticle;
      delete: typeof deleteArticle;
      publish: typeof publishArticle;
      archive: typeof archiveArticle;
      incrementViewCount: typeof incrementViewCount;
      search: typeof searchArticles;
    };
  };

  // Routing
  routing: {
    evaluate: typeof evaluate;
    matchConditions: typeof matchConditions;
    executeAction: typeof executeAction;
    roundRobin: typeof roundRobin;
  };

  // Core event bus and hooks
  eventBus: EventBus;
  hooks: {
    onConversationEvent: typeof onConversationEvent;
    onMessageCreated: typeof onMessageCreated;
  };
  createHookDb: () => HookDb;

  // Test helpers
  users: {
    create: typeof createTestUser;
    get: typeof getTestUser;
  };
  notifications: {
    create: typeof createTestNotification;
    getForUser: typeof getNotificationsForUser;
    setSettings: typeof setNotificationSettings;
    getSettings: typeof getNotificationSettings;
  };
  metrics: {
    compute: typeof computeMetrics;
    checkSla: typeof checkSla;
  };
}

/**
 * Create a fresh Platform instance with all stores reset.
 * Call this in beforeEach() to get isolated test state.
 */
export function createPlatform(): Platform {
  // Reset all in-memory stores
  resetConversationStore();
  resetAgentStore();
  _resetCopilotStore();
  _resetHandoffStore();
  resetRoundRobin();
  clearPortalStore();
  clearCategoryStore();
  clearArticleStore();
  routingAssignments.clear();
  teams.clear();
  userStore.clear();
  notificationStore.length = 0;
  settingsStore.clear();

  const db = createStubDb();
  const conversationAssignmentDb = createConversationAssignmentDb(db);
  const routingDb = createRoutingDb();

  return {
    db,
    routingDb,

    conversations: {
      create: createConversation,
      getById: getConversationById,
      list: listConversations,
      update: updateConversation,
      assign: async (db, conversationId, assigneeId, actorId) => {
        await assignConversation(conversationAssignmentDb, conversationId, assigneeId, actorId);
        return getConversationById(db, conversationId);
      },
      unassign: async (db, conversationId, actorId) => {
        await unassignConversation(conversationAssignmentDb, conversationId, actorId);
        return getConversationById(db, conversationId);
      },
      resolve: resolveConversation,
      reopen: reopenConversation,
      pend: pendConversation,
      snooze: snoozeConversation,
      unsnooze: unsnoozeConversation,
      getEvents: getConversationEvents,
      validateTransition,
      allowedTransitions,
    },

    agents: {
      register: registerAgent,
      getConfig: getAgentConfig,
      list: listAgents,
      updateConfig: updateAgentConfig,
      copilot: {
        createSuggestion,
        generateSuggestion,
        accept: acceptSuggestion,
        dismiss: dismissSuggestion,
        listPending: listPendingSuggestions,
      },
      handoff: {
        requestHandoff,
        toAgent: handoffToAgent,
        agentToAgent: handoffAgentToAgent,
        getEvents: _getHandoffEvents,
        getHandoffs: _getHandoffs,
        seedAssignment: _seedAssignment,
      },
    },

    knowledgeBase: {
      portals: {
        create: createPortal,
        getById: getPortalById,
        getBySlug: getPortalBySlug,
        list: listPortals,
        update: updatePortal,
      },
      categories: {
        create: createCategory,
        getById: getCategoryById,
        listByPortal: listCategoriesByPortal,
        listSubCategories: listSubCategories,
        update: updateCategory,
        delete: deleteCategory,
      },
      articles: {
        create: createArticle,
        getById: getArticleById,
        getBySlug: getArticleBySlug,
        listByPortal: listArticlesByPortal,
        update: updateArticle,
        delete: deleteArticle,
        publish: publishArticle,
        archive: archiveArticle,
        incrementViewCount: incrementViewCount,
        search: searchArticles,
      },
    },

    routing: {
      evaluate,
      matchConditions,
      executeAction,
      roundRobin,
    },

    eventBus: new EventBus(),
    hooks: {
      onConversationEvent,
      onMessageCreated,
    },
    createHookDb: (): HookDb => {
      const hookNotifications: TestNotification[] = [];
      return {
        async updateConversationStatus(conversationId, status) {
          const conv = await getConversationById(db, conversationId);
          if (conv) {
            (conv as { status: string }).status = status;
          }
        },
        async setFirstReplyAt(conversationId, timestamp) {
          const conv = await getConversationById(db, conversationId);
          if (conv) {
            conv.firstReplyAt = timestamp;
          }
        },
        async getParticipantIds(conversationId) {
          return (await conversationAssignmentDb.participants.list(conversationId)).map(p => p.userId);
        },
        async getUser(userId) {
          const user = getTestUser(userId);
          if (!user) return undefined;
          return { id: user.id, type: user.type };
        },
        async createNotification(notification) {
          const n: TestNotification = {
            id: crypto.randomUUID(),
            userId: notification.userId,
            type: notification.type,
            title: notification.type,
            body: notification.message,
            conversationId: notification.conversationId,
            read: false,
            createdAt: new Date(),
          };
          notificationStore.push(n);
          hookNotifications.push(n);
        },
        async getTeamLeadIds() {
          const leadIds: string[] = [];
          for (const team of teams.values()) {
            for (const member of team.members) {
              if (member.role === 'lead') leadIds.push(member.userId);
            }
          }
          return leadIds;
        },
      };
    },

    users: {
      create: createTestUser,
      get: getTestUser,
    },

    notifications: {
      create: createTestNotification,
      getForUser: getNotificationsForUser,
      setSettings: setNotificationSettings,
      getSettings: getNotificationSettings,
    },

    metrics: {
      compute: computeMetrics,
      checkSla: checkSla,
    },
  };
}

export type {
  Conversation,
  ConversationCreate,
  DbClient,
  AgentConfig,
  AgentConfigCreate,
  CopilotSuggestion,
  HandoffRequest,
  RoutableConversation,
  RoutingRule,
  PortalRecord,
  CategoryRecord,
  ArticleRecord,
};
