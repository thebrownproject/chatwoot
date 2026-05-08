import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerAgent,
  getAgentConfig,
  listAgents,
  updateAgentConfig,
  _resetStore,
} from '../data/agents.js';
import type { DbClient } from '../types.js';

const db = {} as DbClient;

beforeEach(() => {
  _resetStore();
});

describe('registerAgent', () => {
  it('creates an agent with generated ID', async () => {
    const agent = await registerAgent(db, {
      name: 'Ron Swanson',
      model: 'claude-sonnet-4-20250514',
      capabilities: ['respond', 'escalate'],
      instructions: 'You are Ron Swanson.',
    });

    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Ron Swanson');
    expect(agent.model).toBe('claude-sonnet-4-20250514');
    expect(agent.capabilities).toEqual(['respond', 'escalate']);
    expect(agent.instructions).toBe('You are Ron Swanson.');
    expect(agent.tools).toEqual([]);
  });

  it('stores tools when provided', async () => {
    const agent = await registerAgent(db, {
      name: 'Toolbot',
      model: 'claude-sonnet-4-20250514',
      capabilities: ['tool_call'],
      instructions: 'Use tools.',
      tools: [{ name: 'search', description: 'Search the KB' }],
    });

    expect(agent.tools).toHaveLength(1);
    expect(agent.tools[0]!.name).toBe('search');
  });
});

describe('getAgentConfig', () => {
  it('returns agent by ID', async () => {
    const created = await registerAgent(db, {
      name: 'Ron',
      model: 'claude-sonnet-4-20250514',
      capabilities: ['respond'],
      instructions: 'Be Ron.',
    });

    const found = await getAgentConfig(db, created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it('returns undefined for unknown ID', async () => {
    const found = await getAgentConfig(db, 'nonexistent');
    expect(found).toBeUndefined();
  });
});

describe('listAgents', () => {
  it('returns all registered agents', async () => {
    await registerAgent(db, {
      name: 'Agent A',
      model: 'model-a',
      capabilities: ['respond'],
      instructions: 'A',
    });
    await registerAgent(db, {
      name: 'Agent B',
      model: 'model-b',
      capabilities: ['suggest'],
      instructions: 'B',
    });

    const agents = await listAgents(db);
    expect(agents).toHaveLength(2);
  });

  it('returns empty array when none registered', async () => {
    const agents = await listAgents(db);
    expect(agents).toEqual([]);
  });
});

describe('updateAgentConfig', () => {
  it('updates name and model', async () => {
    const agent = await registerAgent(db, {
      name: 'Ron',
      model: 'old-model',
      capabilities: ['respond'],
      instructions: 'Be Ron.',
    });

    const updated = await updateAgentConfig(db, agent.id, {
      name: 'Ron Swanson',
      model: 'new-model',
    });

    expect(updated!.name).toBe('Ron Swanson');
    expect(updated!.model).toBe('new-model');
    expect(updated!.instructions).toBe('Be Ron.');
  });

  it('updates capabilities', async () => {
    const agent = await registerAgent(db, {
      name: 'Ron',
      model: 'model',
      capabilities: ['respond'],
      instructions: 'test',
    });

    const updated = await updateAgentConfig(db, agent.id, {
      capabilities: ['respond', 'escalate', 'suggest'],
    });

    expect(updated!.capabilities).toEqual(['respond', 'escalate', 'suggest']);
  });

  it('updates tools', async () => {
    const agent = await registerAgent(db, {
      name: 'Ron',
      model: 'model',
      capabilities: ['tool_call'],
      instructions: 'test',
    });

    const updated = await updateAgentConfig(db, agent.id, {
      tools: [{ name: 'lookup', description: 'Look up customer' }],
    });

    expect(updated!.tools).toHaveLength(1);
    expect(updated!.tools[0]!.name).toBe('lookup');
  });

  it('returns undefined for unknown ID', async () => {
    const result = await updateAgentConfig(db, 'nonexistent', { name: 'X' });
    expect(result).toBeUndefined();
  });
});
