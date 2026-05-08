import { describe, it, expect } from 'vitest';
import {
  listRoutingRules,
  getRoutingRule,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  toggleRoutingRule,
} from '../data/routing-rules.js';
import { createMockDb } from './helpers.js';

describe('routing rules CRUD', () => {
  it('creates a routing rule', async () => {
    const db = createMockDb();
    const rule = await createRoutingRule(db, {
      name: 'Email to Support',
      priority: 10,
      conditions: { channel: 'email' },
      action: 'assign_team',
      targetType: 'team',
      targetId: '00000000-0000-0000-0000-000000000001',
    });

    expect(rule.id).toBeDefined();
    expect(rule.name).toBe('Email to Support');
    expect(rule.priority).toBe(10);
    expect(rule.active).toBe(true);
  });

  it('lists rules ordered by priority', async () => {
    const db = createMockDb();
    await createRoutingRule(db, {
      name: 'Low priority',
      priority: 20,
      conditions: {},
      action: 'assign_agent',
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000001',
    });
    await createRoutingRule(db, {
      name: 'High priority',
      priority: 5,
      conditions: {},
      action: 'assign_agent',
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000002',
    });

    const rules = await listRoutingRules(db);
    expect(rules).toHaveLength(2);
    expect(rules[0]!.name).toBe('High priority');
    expect(rules[1]!.name).toBe('Low priority');
  });

  it('gets a rule by ID', async () => {
    const db = createMockDb();
    const created = await createRoutingRule(db, {
      name: 'Test',
      priority: 1,
      conditions: {},
      action: 'assign_agent',
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000001',
    });

    const fetched = await getRoutingRule(db, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('Test');
  });

  it('returns null for nonexistent rule', async () => {
    const db = createMockDb();
    const result = await getRoutingRule(db, 'nonexistent');
    expect(result).toBeNull();
  });

  it('updates a rule', async () => {
    const db = createMockDb();
    const created = await createRoutingRule(db, {
      name: 'Original',
      priority: 10,
      conditions: {},
      action: 'assign_agent',
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000001',
    });

    const updated = await updateRoutingRule(db, created.id, {
      name: 'Updated',
      priority: 5,
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated');
    expect(updated!.priority).toBe(5);
    // Unchanged fields preserved
    expect(updated!.action).toBe('assign_agent');
  });

  it('deletes a rule', async () => {
    const db = createMockDb();
    const created = await createRoutingRule(db, {
      name: 'To Delete',
      priority: 1,
      conditions: {},
      action: 'assign_agent',
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000001',
    });

    const deleted = await deleteRoutingRule(db, created.id);
    expect(deleted).toBe(true);

    const fetched = await getRoutingRule(db, created.id);
    expect(fetched).toBeNull();
  });

  it('returns false when deleting nonexistent rule', async () => {
    const db = createMockDb();
    const deleted = await deleteRoutingRule(db, 'nonexistent');
    expect(deleted).toBe(false);
  });

  it('toggles a rule active/inactive', async () => {
    const db = createMockDb();
    const created = await createRoutingRule(db, {
      name: 'Toggle Me',
      priority: 1,
      conditions: {},
      action: 'assign_agent',
      targetType: 'user',
      targetId: '00000000-0000-0000-0000-000000000001',
      active: true,
    });

    const toggled = await toggleRoutingRule(db, created.id);
    expect(toggled).not.toBeNull();
    expect(toggled!.active).toBe(false);

    const toggledBack = await toggleRoutingRule(db, created.id);
    expect(toggledBack!.active).toBe(true);
  });

  it('returns null when toggling nonexistent rule', async () => {
    const db = createMockDb();
    const result = await toggleRoutingRule(db, 'nonexistent');
    expect(result).toBeNull();
  });
});
