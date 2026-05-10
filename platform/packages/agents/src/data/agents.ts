import type {
  AgentConfig,
  AgentConfigCreate,
  AgentConfigUpdate,
  DbClient,
} from '../types.js';

// ---------------------------------------------------------------------------
// In-memory store. Replace with Drizzle queries against @buildpass/db.
// Not multi-process safe -- each process would have its own copy.
// ---------------------------------------------------------------------------

/** In-memory only. Replace with DB queries for multi-process deployment. */
const store = new Map<string, AgentConfig>();

function generateId(): string {
  return crypto.randomUUID();
}

/** Reset internal state (for tests only). */
export function _resetStore(): void {
  store.clear();
}

// ---------------------------------------------------------------------------
// Agent CRUD
// ---------------------------------------------------------------------------

/**
 * Register a new ai_agent user with agent config in metadata.
 * Creates a User record with type=ai_agent and stores config in metadata.
 */
export async function registerAgent(
  _db: DbClient,
  data: AgentConfigCreate,
): Promise<AgentConfig> {
  const trimmedName = data.name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Agent name must not be empty');
  }

  const trimmedInstructions = data.instructions.trim();
  if (trimmedInstructions.length === 0) {
    throw new Error('Agent instructions must not be empty');
  }

  const id = generateId();
  const config: AgentConfig = {
    id,
    name: trimmedName,
    model: data.model,
    capabilities: data.capabilities,
    instructions: trimmedInstructions,
    tools: data.tools ?? [],
  };

  store.set(id, config);
  return config;
}

/**
 * Get agent configuration by ID.
 */
export async function getAgentConfig(
  _db: DbClient,
  agentId: string,
): Promise<AgentConfig | undefined> {
  return store.get(agentId);
}

/**
 * List all registered ai_agent users with their configs.
 */
export async function listAgents(
  _db: DbClient,
): Promise<AgentConfig[]> {
  return [...store.values()];
}

/**
 * Update an agent's configuration (capabilities, model, instructions, tools).
 */
export async function updateAgentConfig(
  _db: DbClient,
  agentId: string,
  data: AgentConfigUpdate,
): Promise<AgentConfig | undefined> {
  const existing = store.get(agentId);
  if (!existing) return undefined;

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length === 0) throw new Error('Agent name must not be empty');
    existing.name = trimmed;
  }
  if (data.model !== undefined) existing.model = data.model;
  if (data.capabilities !== undefined) existing.capabilities = data.capabilities;
  if (data.instructions !== undefined) {
    const trimmed = data.instructions.trim();
    if (trimmed.length === 0) throw new Error('Agent instructions must not be empty');
    existing.instructions = trimmed;
  }
  if (data.tools !== undefined) existing.tools = data.tools;

  return existing;
}
