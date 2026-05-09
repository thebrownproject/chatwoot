import { and, asc, desc, eq, isNull, lte } from 'drizzle-orm';
import type { Db } from './client.js';
import {
  conversationEvents,
  conversationParticipants,
  conversations,
  permissions,
  routingRules,
  teamMembers,
  teams,
  users,
} from './schema/index.js';
import type {
  Conversation,
  ConversationEvent,
  NewConversationEvent,
  NewRoutingRule,
  NewTeam,
  NewUser,
  Permission,
  ConversationParticipant,
  RoutingRule,
  Team,
  TeamMember,
  User,
} from './types.js';

type UserListFilters = {
  type?: User['type'];
  limit?: number;
  offset?: number;
};

type UserUpdate = Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'metadata' | 'apiKeyHash' | 'apiKeyLookupHash'>>;
type RoutingRuleCreate = Pick<
  NewRoutingRule,
  'name' | 'priority' | 'conditions' | 'action' | 'targetType' | 'targetId' | 'active'
>;
type RoutingRuleUpdate = Partial<RoutingRuleCreate>;
type TeamCreate = Pick<NewTeam, 'name'>;
type TeamMemberRole = TeamMember['role'];
type ConversationStatus = Conversation['status'];
type ParticipantRole = ConversationParticipant['role'];
type ConversationEventCreate = Omit<NewConversationEvent, 'id' | 'createdAt'>;
type AssignedConversationFilters = Partial<Pick<Conversation, 'status' | 'priority'>>;
type ConversationAssignee = Pick<User, 'id' | 'name' | 'email' | 'type'>;
type ParticipantWithUser = ConversationParticipant & {
  user: Pick<User, 'id' | 'name' | 'email' | 'type'>;
};
type AssignedConversation = Pick<
  Conversation,
  'id' | 'displayId' | 'status' | 'priority' | 'subject' | 'assigneeId' | 'createdAt' | 'updatedAt'
>;

function createIdentityAdapters(db: Db) {
  return {
    users: {
      async findById(id: string): Promise<User | null> {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        return user ?? null;
      },
      async findByEmail(email: string): Promise<User | null> {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);
        return user ?? null;
      },
      async findByClerkId(clerkId: string): Promise<User | null> {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);
        return user ?? null;
      },
      async findByApiKeyHash(hash: string): Promise<User | null> {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.apiKeyLookupHash, hash))
          .limit(1);
        return user ?? null;
      },
      async list(filters: UserListFilters = {}): Promise<User[]> {
        const limit = filters.limit ?? 50;
        const offset = filters.offset ?? 0;

        if (filters.type) {
          return db
            .select()
            .from(users)
            .where(eq(users.type, filters.type))
            .orderBy(asc(users.createdAt))
            .limit(limit)
            .offset(offset);
        }

        return db
          .select()
          .from(users)
          .orderBy(asc(users.createdAt))
          .limit(limit)
          .offset(offset);
      },
      async insert(data: NewUser): Promise<User> {
        const [user] = await db
          .insert(users)
          .values(data)
          .returning();
        if (!user) throw new Error('Failed to insert user');
        return user;
      },
      async update(id: string, data: UserUpdate): Promise<User | null> {
        const [user] = await db
          .update(users)
          .set(data)
          .where(eq(users.id, id))
          .returning();
        return user ?? null;
      },
    },
    permissions: {
      async findByUserId(userId: string): Promise<Permission | null> {
        const [permission] = await db
          .select()
          .from(permissions)
          .where(eq(permissions.userId, userId))
          .limit(1);
        return permission ?? null;
      },
      async upsert(
        userId: string,
        role: Permission['role'],
        capabilities: string[],
      ): Promise<Permission> {
        const [permission] = await db
          .insert(permissions)
          .values({ userId, role, capabilities })
          .onConflictDoUpdate({
            target: permissions.userId,
            set: { role, capabilities },
          })
          .returning();
        if (!permission) throw new Error('Failed to upsert permission');
        return permission;
      },
    },
  };
}

function createRoutingAdapters(db: Db) {
  return {
    db,
    async listRoutingRules(): Promise<RoutingRule[]> {
      return db
        .select()
        .from(routingRules)
        .orderBy(asc(routingRules.priority), asc(routingRules.createdAt));
    },
    async getRoutingRule(id: string): Promise<RoutingRule | null> {
      const [rule] = await db
        .select()
        .from(routingRules)
        .where(eq(routingRules.id, id))
        .limit(1);
      return rule ?? null;
    },
    async createRoutingRule(data: RoutingRuleCreate): Promise<RoutingRule> {
      const [rule] = await db
        .insert(routingRules)
        .values(data)
        .returning();
      if (!rule) throw new Error('Failed to insert routing rule');
      return rule;
    },
    async updateRoutingRule(
      id: string,
      data: RoutingRuleUpdate,
    ): Promise<RoutingRule | null> {
      const [rule] = await db
        .update(routingRules)
        .set(data)
        .where(eq(routingRules.id, id))
        .returning();
      return rule ?? null;
    },
    async deleteRoutingRule(id: string): Promise<boolean> {
      const deleted = await db
        .delete(routingRules)
        .where(eq(routingRules.id, id))
        .returning({ id: routingRules.id });
      return deleted.length > 0;
    },
    async listTeams(): Promise<Team[]> {
      return db
        .select()
        .from(teams)
        .orderBy(asc(teams.name));
    },
    async getTeam(id: string): Promise<Team | null> {
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, id))
        .limit(1);
      return team ?? null;
    },
    async createTeam(data: TeamCreate): Promise<Team> {
      const [team] = await db
        .insert(teams)
        .values(data)
        .returning();
      if (!team) throw new Error('Failed to insert team');
      return team;
    },
    async deleteTeam(id: string): Promise<boolean> {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
      const deleted = await db
        .delete(teams)
        .where(eq(teams.id, id))
        .returning({ id: teams.id });
      return deleted.length > 0;
    },
    async getTeamMembers(teamId: string): Promise<TeamMember[]> {
      return db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId))
        .orderBy(asc(teamMembers.createdAt));
    },
    async addTeamMember(
      teamId: string,
      userId: string,
      role: TeamMemberRole,
    ): Promise<TeamMember> {
      const [member] = await db
        .insert(teamMembers)
        .values({ teamId, userId, role })
        .onConflictDoUpdate({
          target: [teamMembers.teamId, teamMembers.userId],
          set: { role },
        })
        .returning();
      if (!member) throw new Error('Failed to upsert team member');
      return member;
    },
    async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
      const deleted = await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
        .returning({ userId: teamMembers.userId });
      return deleted.length > 0;
    },
    async getSnoozedConversationsDue(): Promise<Array<{ id: string }>> {
      return db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.status, 'snoozed'),
            lte(conversations.snoozedUntil, new Date()),
          ),
        );
    },
    async updateConversationStatus(
      id: string,
      status: ConversationStatus,
    ): Promise<void> {
      await db
        .update(conversations)
        .set({
          status,
          snoozedUntil: status === 'snoozed' ? undefined : null,
        })
        .where(eq(conversations.id, id));
    },
    async assignConversation(
      conversationId: string,
      assigneeId: string,
    ): Promise<void> {
      await db
        .update(conversations)
        .set({ assigneeId })
        .where(eq(conversations.id, conversationId));
    },
    async createConversationEvent(
      data: Omit<NewConversationEvent, 'id' | 'createdAt'>,
    ): Promise<ConversationEvent> {
      const [event] = await db
        .insert(conversationEvents)
        .values(data)
        .returning();
      if (!event) throw new Error('Failed to insert conversation event');
      return event;
    },
  };
}

function assignedConversationConditions(
  assigneeId: string | null,
  filters: AssignedConversationFilters = {},
) {
  const conditions = [
    assigneeId === null
      ? isNull(conversations.assigneeId)
      : eq(conversations.assigneeId, assigneeId),
  ];

  if (filters.status) {
    conditions.push(eq(conversations.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(conversations.priority, filters.priority));
  }

  return and(...conditions);
}

function createConversationAdapters(db: Db) {
  return {
    db,
    participants: {
      async add(
        conversationId: string,
        userId: string,
        role: ParticipantRole,
      ): Promise<ConversationParticipant> {
        const [participant] = await db
          .insert(conversationParticipants)
          .values({ conversationId, userId, role })
          .returning();
        if (!participant) throw new Error('Failed to insert conversation participant');
        return participant;
      },
      async remove(conversationId: string, userId: string): Promise<void> {
        await db
          .update(conversationParticipants)
          .set({ leftAt: new Date() })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId),
              isNull(conversationParticipants.leftAt),
            ),
          );
      },
      async list(conversationId: string): Promise<ParticipantWithUser[]> {
        const rows = await db
          .select({
            id: conversationParticipants.id,
            conversationId: conversationParticipants.conversationId,
            userId: conversationParticipants.userId,
            role: conversationParticipants.role,
            joinedAt: conversationParticipants.joinedAt,
            leftAt: conversationParticipants.leftAt,
            user: {
              id: users.id,
              name: users.name,
              email: users.email,
              type: users.type,
            },
          })
          .from(conversationParticipants)
          .innerJoin(users, eq(users.id, conversationParticipants.userId))
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              isNull(conversationParticipants.leftAt),
            ),
          )
          .orderBy(asc(conversationParticipants.joinedAt));

        return rows;
      },
      async getRole(
        conversationId: string,
        userId: string,
      ): Promise<ParticipantRole | null> {
        const [participant] = await db
          .select({ role: conversationParticipants.role })
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId),
              isNull(conversationParticipants.leftAt),
            ),
          )
          .limit(1);
        return participant?.role ?? null;
      },
      async updateRole(
        conversationId: string,
        userId: string,
        role: ParticipantRole,
      ): Promise<void> {
        await db
          .update(conversationParticipants)
          .set({ role })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId),
              isNull(conversationParticipants.leftAt),
            ),
          );
      },
      async exists(conversationId: string, userId: string): Promise<boolean> {
        const [participant] = await db
          .select({ id: conversationParticipants.id })
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId),
              isNull(conversationParticipants.leftAt),
            ),
          )
          .limit(1);
        return participant !== undefined;
      },
    },
    conversations: {
      async setAssignee(
        conversationId: string,
        assigneeId: string | null,
      ): Promise<void> {
        await db
          .update(conversations)
          .set({ assigneeId })
          .where(eq(conversations.id, conversationId));
      },
      async getAssignee(conversationId: string): Promise<ConversationAssignee | null> {
        const [row] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            type: users.type,
          })
          .from(conversations)
          .innerJoin(users, eq(users.id, conversations.assigneeId))
          .where(eq(conversations.id, conversationId))
          .limit(1);

        return row ?? null;
      },
      async listAssigned(
        userId: string,
        filters: AssignedConversationFilters = {},
      ): Promise<AssignedConversation[]> {
        return db
          .select({
            id: conversations.id,
            displayId: conversations.displayId,
            status: conversations.status,
            priority: conversations.priority,
            subject: conversations.subject,
            assigneeId: conversations.assigneeId,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
          })
          .from(conversations)
          .where(assignedConversationConditions(userId, filters))
          .orderBy(desc(conversations.createdAt));
      },
      async listUnassigned(
        filters: AssignedConversationFilters = {},
      ): Promise<AssignedConversation[]> {
        return db
          .select({
            id: conversations.id,
            displayId: conversations.displayId,
            status: conversations.status,
            priority: conversations.priority,
            subject: conversations.subject,
            assigneeId: conversations.assigneeId,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
          })
          .from(conversations)
          .where(assignedConversationConditions(null, filters))
          .orderBy(desc(conversations.createdAt));
      },
    },
    events: {
      async create(data: ConversationEventCreate): Promise<ConversationEvent> {
        const [event] = await db
          .insert(conversationEvents)
          .values(data)
          .returning();
        if (!event) throw new Error('Failed to insert conversation event');
        return event;
      },
      async list(conversationId: string): Promise<ConversationEvent[]> {
        return db
          .select()
          .from(conversationEvents)
          .where(eq(conversationEvents.conversationId, conversationId))
          .orderBy(asc(conversationEvents.createdAt));
      },
      async listByType(
        conversationId: string,
        eventType: ConversationEvent['eventType'],
      ): Promise<ConversationEvent[]> {
        return db
          .select()
          .from(conversationEvents)
          .where(
            and(
              eq(conversationEvents.conversationId, conversationId),
              eq(conversationEvents.eventType, eventType),
            ),
          )
          .orderBy(asc(conversationEvents.createdAt));
      },
    },
  };
}

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

    identity: createIdentityAdapters(db),

    conversations: createConversationAdapters(db),

    channels: {
      db,
      // Implements channel CRUD
      // Wire: createChannel, listChannels, etc.
    },

    routing: createRoutingAdapters(db),

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
