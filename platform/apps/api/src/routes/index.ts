import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import { db, createAdapters } from '@buildpass/db';
import { createAuthRoutes, createUserRoutes } from '@buildpass/identity';
import {
  assignmentRoutes,
  cannedResponseRoutes,
  conversationRoutes,
  eventsRoutes,
  labelRoutes,
  messageRoutes,
  participantsRoutes,
} from '@buildpass/conversations';
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
const adapters = createAdapters(db);
const channelDb = createChannelDb();
const widgetStore = createWidgetStore();
const defaultActorId = process.env.DEFAULT_ACTOR_ID ?? '00000000-0000-4000-8000-000000000000';
const userDb = adapters.identity.users as unknown as UserDb;
const routingDb = adapters.routing as unknown as RoutingDb;
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
  c.set('db', db);
  c.set('actorId', c.req.header('x-actor-id') ?? defaultActorId);
  c.set('userId', c.req.header('x-user-id') ?? defaultActorId);
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
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/messages/*', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.route('/', messageRoutes);
routes.route('/', labelRoutes);
routes.route('/', cannedResponseRoutes);

routes.use('/conversations/:id/participants', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/conversations/:id/participants/:userId', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/conversations/:id/assign', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/conversations/:id/unassign', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/conversations/assigned/:userId', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/conversations/unassigned', async (c, next) => {
  c.set('db', adapters.conversations);
  await next();
});
routes.use('/conversations/:id/events', async (c, next) => {
  c.set('db', adapters.conversations);
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
