import { Hono } from 'hono';
import { z } from 'zod';
import {
  registerAgent,
  getAgentConfig,
  listAgents,
  updateAgentConfig,
} from '../data/agents.js';
import type { AgentHandler, DbClient } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const capabilitySchema = z.enum([
  'respond',
  'suggest',
  'escalate',
  'tool_call',
  'triage',
  'summarize',
]);

const toolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()).optional(),
});

const createAgentSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  capabilities: z.array(capabilitySchema).min(1),
  instructions: z.string(),
  tools: z.array(toolDefinitionSchema).optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  capabilities: z.array(capabilitySchema).min(1).optional(),
  instructions: z.string().optional(),
  tools: z.array(toolDefinitionSchema).optional(),
});

const processMessageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.object({
    id: z.string(),
    senderId: z.string(),
    senderType: z.enum(['human_agent', 'ai_agent', 'contact', 'system']),
    body: z.string(),
    visibility: z.enum(['public', 'internal']),
    createdAt: z.string().datetime(),
  }),
});

// ---------------------------------------------------------------------------
// Route type
// ---------------------------------------------------------------------------

type Env = { Variables: { db: DbClient; agentHandler: AgentHandler } };

/**
 * Agent routes as a Hono app.
 * Mount with `app.route('/agents', agentRoutes)`.
 *
 * Expects `db` and `agentHandler` variables set via middleware.
 */
export const agentRoutes = new Hono<Env>();

// ---------------------------------------------------------------------------
// GET /agents — list registered agents
// ---------------------------------------------------------------------------

agentRoutes.get('/', async (c) => {
  const db = c.get('db');
  const agents = await listAgents(db);
  return c.json({ data: agents });
});

// ---------------------------------------------------------------------------
// POST /agents — register new agent
// ---------------------------------------------------------------------------

agentRoutes.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const agent = await registerAgent(db, parsed.data);
  return c.json(agent, 201);
});

// ---------------------------------------------------------------------------
// GET /agents/:id — get agent config
// ---------------------------------------------------------------------------

agentRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const config = await getAgentConfig(db, id);
  if (!config) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({ data: config });
});

// ---------------------------------------------------------------------------
// PATCH /agents/:id — update agent config
// ---------------------------------------------------------------------------

agentRoutes.patch('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateAgentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const updated = await updateAgentConfig(db, id, parsed.data);
  if (!updated) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({ data: updated });
});

// ---------------------------------------------------------------------------
// POST /agents/:id/process — trigger agent to process a message
// ---------------------------------------------------------------------------

agentRoutes.post('/:id/process', async (c) => {
  const db = c.get('db');
  const handler = c.get('agentHandler');
  const agentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = processMessageSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const orchestrator = new AgentOrchestrator(handler);

  const message = {
    ...parsed.data.message,
    createdAt: new Date(parsed.data.message.createdAt),
  };

  const response = await orchestrator.processMessage(
    db,
    agentId,
    parsed.data.conversationId,
    message,
  );

  return c.json({ data: response });
});
