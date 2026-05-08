/**
 * Route registry -- mounts all module routes into the Hono API server.
 *
 * Each module import is wrapped in a try/catch so the server still boots
 * when a package isn't installed yet. DB access uses a lazy proxy that
 * throws a clear error if routes are hit before initializeDb() is called.
 */

import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// App type -- shared env across all routes
// ---------------------------------------------------------------------------

type AppEnv = {
  Variables: {
    db: unknown;
    requestId: string;
  };
};

const api = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Lazy DB proxy -- throws a clear error if accessed before initialization
// ---------------------------------------------------------------------------

function createLazyDb() {
  return new Proxy({} as any, {
    get(_, prop) {
      throw new Error(
        `Database not initialized. Call initializeDb() before handling requests. Accessed: ${String(prop)}`,
      );
    },
  });
}

const lazyDb = createLazyDb();

// ---------------------------------------------------------------------------
// Health (built-in, no external dependency)
// ---------------------------------------------------------------------------

api.get('/api/v1/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// ---------------------------------------------------------------------------
// Helper: safely mount a module's routes
// ---------------------------------------------------------------------------

type MountFn = () => Promise<Hono<any>>;

async function tryMount(
  app: Hono<AppEnv>,
  path: string,
  mount: MountFn,
  label: string,
): Promise<boolean> {
  try {
    const routes = await mount();
    app.route(path, routes);
    return true;
  } catch {
    console.warn(`[routes] ${label} not available -- skipping ${path}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Mount all module routes
// ---------------------------------------------------------------------------

export async function mountAllRoutes(app: Hono<AppEnv>): Promise<void> {
  // Health is always available
  app.route('', api);

  // -- identity ---------------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/users',
    async () => {
      const { createUserRoutes } = await import('@buildpass/identity');
      return createUserRoutes(lazyDb);
    },
    'identity:users',
  );

  await tryMount(
    app,
    '/api/v1/auth',
    async () => {
      const { createAuthRoutes } = await import('@buildpass/identity');
      return createAuthRoutes({
        userDb: lazyDb,
        verifyClerkToken: async () => '',
        hashApiKey: () => '',
      });
    },
    'identity:auth',
  );

  // -- conversations ----------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/conversations',
    async () => {
      const { conversationRoutes } = await import('@buildpass/conversations');
      return conversationRoutes;
    },
    'conversations',
  );

  // Messages are nested under conversations:
  // GET/POST /api/v1/conversations/:id/messages
  // The messageRoutes define paths like /conversations/:id/messages internally,
  // so mount at the /api/v1 prefix to produce /api/v1/conversations/:id/messages.
  await tryMount(
    app,
    '/api/v1',
    async () => {
      const { messageRoutes } = await import('@buildpass/conversations');
      return messageRoutes;
    },
    'conversations:messages',
  );

  await tryMount(
    app,
    '/api/v1/labels',
    async () => {
      const { labelRoutes } = await import('@buildpass/conversations');
      return labelRoutes;
    },
    'conversations:labels',
  );

  await tryMount(
    app,
    '/api/v1/canned-responses',
    async () => {
      const { cannedResponseRoutes } = await import('@buildpass/conversations');
      return cannedResponseRoutes;
    },
    'conversations:canned-responses',
  );

  // -- channels ---------------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/channels',
    async () => {
      const { channelRoutes } = await import('@buildpass/channels');
      return channelRoutes(lazyDb);
    },
    'channels',
  );

  await tryMount(
    app,
    '/api/v1/widget',
    async () => {
      const { widgetRoutes, createWidgetStore } = await import(
        '@buildpass/channels'
      );
      return widgetRoutes(createWidgetStore());
    },
    'channels:widget',
  );

  await tryMount(
    app,
    '/api/v1/webhooks',
    async () => {
      const { emailWebhookRoutes } = await import(
        '@buildpass/channels/routes/email-webhook'
      );
      return emailWebhookRoutes;
    },
    'channels:webhooks',
  );

  // -- routing ----------------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/routing-rules',
    async () => {
      const { routingRulesRoutes } = await import('@buildpass/routing');
      return routingRulesRoutes(lazyDb);
    },
    'routing:rules',
  );

  await tryMount(
    app,
    '/api/v1/teams',
    async () => {
      const { teamsRoutes } = await import('@buildpass/routing');
      return teamsRoutes(lazyDb);
    },
    'routing:teams',
  );

  // -- agents -----------------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/agents',
    async () => {
      const { agentRoutes } = await import('@buildpass/agents');
      return agentRoutes;
    },
    'agents',
  );

  // -- knowledge base ---------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/portals',
    async () => {
      const { createPortalRoutes } = await import('@buildpass/knowledge-base');
      return createPortalRoutes(lazyDb);
    },
    'knowledge-base:portals',
  );

  await tryMount(
    app,
    '/api/v1/articles',
    async () => {
      const { createArticleRoutes } = await import(
        '@buildpass/knowledge-base'
      );
      return createArticleRoutes(lazyDb);
    },
    'knowledge-base:articles',
  );

  await tryMount(
    app,
    '/api/v1/categories',
    async () => {
      const { createCategoryRoutes } = await import(
        '@buildpass/knowledge-base'
      );
      return createCategoryRoutes(lazyDb);
    },
    'knowledge-base:categories',
  );

  await tryMount(
    app,
    '/help',
    async () => {
      const { createPublicRoutes } = await import('@buildpass/knowledge-base');
      return createPublicRoutes(lazyDb);
    },
    'knowledge-base:public',
  );

  // -- notifications ----------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/notifications',
    async () => {
      const { createNotificationRoutes } = await import(
        '@buildpass/notifications'
      );
      return createNotificationRoutes();
    },
    'notifications',
  );

  // -- analytics --------------------------------------------------------------
  await tryMount(
    app,
    '/api/v1/analytics',
    async () => {
      const { createAnalyticsRoutes } = await import('@buildpass/analytics');
      return createAnalyticsRoutes();
    },
    'analytics',
  );
}
