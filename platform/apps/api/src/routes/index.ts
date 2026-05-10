import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import { db, createAdapters } from '@buildpass/db';
import { createAuthRoutes, createUserRoutes, type AuthContext } from '@buildpass/identity';
import {
  assignmentRoutes,
  cannedResponseRoutes,
  conversationRoutes,
  createTestDb,
  eventsRoutes,
  labelRoutes,
  messageRoutes,
  participantsRoutes,
} from '@buildpass/conversations';
import type { Db as ConversationDb } from '@buildpass/conversations';
import { channelRoutes, createChannelDb, createWidgetStore, widgetRoutes } from '@buildpass/channels';
import { agentRoutes, copilotRoutes, handoffRoutes } from '@buildpass/agents';
import { routingRulesRoutes, teamsRoutes } from '@buildpass/routing';
import type { UserDb } from '@buildpass/identity/data/users';
import type { RoutingDb } from '@buildpass/routing';
import { health } from './health.js';
import { apiDocs } from './api-docs.js';

type ApiEnv = {
  Variables: {
    requestId: string;
    db: unknown;
    actorId: string;
    userId: string;
    agentHandler: unknown;
  };
};

const routes = new Hono<ApiEnv>();
const hasDatabase = !!process.env.DATABASE_URL;
const adapters = hasDatabase ? createAdapters(db) : null;
const conversationDb: ConversationDb = adapters?.conversations as unknown as ConversationDb ?? createTestDb();
const channelDb = createChannelDb();
const widgetStore = createWidgetStore();
const defaultActorId = process.env.DEFAULT_ACTOR_ID ?? '00000000-0000-4000-8000-000000000000';

// In-memory stubs for identity and routing when no database is available
const stubUserDb: UserDb = {
  async findById() { return null; },
  async findByEmail() { return null; },
  async findByClerkId() { return null; },
  async findByApiKeyHash() { return null; },
  async list() { return []; },
  async insert(data) {
    return {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email ?? null,
      type: data.type,
      avatarUrl: data.avatarUrl ?? null,
      clerkId: data.clerkId ?? null,
      apiKeyHash: null,
      apiKeyLookupHash: null,
      metadata: data.metadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  async update() { return null; },
};

const stubRoutingDb: RoutingDb = {
  async listRoutingRules() { return []; },
  async getRoutingRule() { return null; },
  async createRoutingRule(data) { return { ...data, id: crypto.randomUUID(), active: data.active ?? true, createdAt: new Date(), updatedAt: new Date() }; },
  async updateRoutingRule() { return null; },
  async deleteRoutingRule() { return false; },
  async listTeams() { return []; },
  async getTeam() { return null; },
  async createTeam(data) { return { id: crypto.randomUUID(), name: data.name, createdAt: new Date(), updatedAt: new Date() }; },
  async deleteTeam() { return false; },
  async getTeamMembers() { return []; },
  async addTeamMember(teamId, userId, role) { return { teamId, userId, role, createdAt: new Date() }; },
  async removeTeamMember() { return false; },
  async getSnoozedConversationsDue() { return []; },
  async updateConversationStatus() {},
  async assignConversation() {},
};

const userDb = (adapters?.identity.users as unknown as UserDb) ?? stubUserDb;
const routingDb = (adapters?.routing as unknown as RoutingDb) ?? stubRoutingDb;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function addUuidParam(candidate: string | undefined, candidates: string[]): void {
  if (candidate) candidates.push(candidate);
}

function pathUuidParams(path: string): string[] {
  const segments = path.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);
  const [resource, firstParam, nestedResource, nestedParam] = segments;
  const candidates: string[] = [];

  if (resource === 'conversations') {
    if (firstParam === 'assigned') {
      addUuidParam(nestedResource, candidates);
      return candidates;
    }

    if (firstParam && !['by-number', 'unassigned'].includes(firstParam)) {
      addUuidParam(firstParam, candidates);
    }

    if (['labels', 'participants'].includes(nestedResource ?? '')) {
      addUuidParam(nestedParam, candidates);
    }

    return candidates;
  }

  if (
    firstParam &&
    ['agents', 'canned-responses', 'channels', 'messages', 'routing-rules', 'teams', 'users'].includes(resource ?? '')
  ) {
    if (resource === 'canned-responses' && firstParam === 'search') return candidates;
    if (resource === 'messages' && firstParam === 'search') return candidates;
    addUuidParam(firstParam, candidates);
  }

  return candidates;
}

routes.use('*', async (c, next) => {
  c.set('db', conversationDb);

  // Derive actor/user ID from auth context (set by auth middleware) when available.
  // Falls back to defaultActorId for unauthenticated paths (health, docs, widget).
  // SECURITY: Never read from x-actor-id / x-user-id headers — they are spoofable.
  const auth = (c.get as (key: string) => AuthContext | undefined)('auth');
  const authenticatedUserId = auth?.user?.id;
  c.set('actorId', authenticatedUserId ?? defaultActorId);
  c.set('userId', authenticatedUserId ?? defaultActorId);

  c.set('agentHandler', async () => ({
    action: 'suggest',
    content: '',
    metadata: {},
  }));
  await next();
});

routes.use('*', async (c, next) => {
  const invalidParam = pathUuidParams(c.req.path).find((param) => !uuidPattern.test(param));
  if (invalidParam) {
    return c.json({ error: 'Invalid ID parameter' }, 400);
  }

  await next();
});

routes.route('/health', health);
routes.route('/docs', apiDocs);
routes.route('/auth', createAuthRoutes({
  userDb,
  verifyClerkToken: async () => {
    throw new Error('Clerk verification is not configured');
  },
  hashApiKey: (key) => createHash('sha256').update(key).digest('hex'),
}));
routes.route('/users', createUserRoutes(userDb));

routes.use('/conversations/:id/messages', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/messages/*', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.route('/', messageRoutes);
routes.route('/', labelRoutes);
routes.route('/', cannedResponseRoutes);

routes.use('/conversations/:id/participants', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/conversations/:id/participants/:userId', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/conversations/:id/assign', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/conversations/:id/unassign', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/conversations/assigned/:userId', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/conversations/unassigned', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.use('/conversations/:id/events', async (c, next) => {
  c.set('db', conversationDb);
  await next();
});
routes.route('/', participantsRoutes);
routes.route('/', assignmentRoutes);
routes.route('/', eventsRoutes);
routes.route('/conversations', conversationRoutes);

routes.route('/channels', channelRoutes(channelDb));
routes.route('/widget', widgetRoutes(widgetStore));

routes.route('/agents', agentRoutes);
routes.route('/conversations', copilotRoutes);
routes.route('/conversations', handoffRoutes);

routes.route('/routing-rules', routingRulesRoutes(routingDb));
routes.route('/teams', teamsRoutes(routingDb));

export { routes };
