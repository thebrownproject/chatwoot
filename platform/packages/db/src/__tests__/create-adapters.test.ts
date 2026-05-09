import { describe, expect, it } from 'vitest';
import { createAdapters } from '../create-adapters.js';

describe('createAdapters', () => {
  it('provides concrete identity adapter methods', () => {
    const adapters = createAdapters({} as never);

    expect(adapters.identity.users).toMatchObject({
      findById: expect.any(Function),
      findByEmail: expect.any(Function),
      findByClerkId: expect.any(Function),
      findByApiKeyHash: expect.any(Function),
      list: expect.any(Function),
      insert: expect.any(Function),
      update: expect.any(Function),
    });

    expect(adapters.identity.permissions).toMatchObject({
      findByUserId: expect.any(Function),
      upsert: expect.any(Function),
    });
  });

  it('provides concrete routing adapter methods', () => {
    const adapters = createAdapters({} as never);

    expect(adapters.routing).toMatchObject({
      listRoutingRules: expect.any(Function),
      getRoutingRule: expect.any(Function),
      createRoutingRule: expect.any(Function),
      updateRoutingRule: expect.any(Function),
      deleteRoutingRule: expect.any(Function),
      listTeams: expect.any(Function),
      getTeam: expect.any(Function),
      createTeam: expect.any(Function),
      deleteTeam: expect.any(Function),
      getTeamMembers: expect.any(Function),
      addTeamMember: expect.any(Function),
      removeTeamMember: expect.any(Function),
      getSnoozedConversationsDue: expect.any(Function),
      updateConversationStatus: expect.any(Function),
      assignConversation: expect.any(Function),
      createConversationEvent: expect.any(Function),
    });
  });

  it('provides concrete conversations adapter methods', () => {
    const adapters = createAdapters({} as never);

    expect(adapters.conversations.participants).toMatchObject({
      add: expect.any(Function),
      remove: expect.any(Function),
      list: expect.any(Function),
      getRole: expect.any(Function),
      updateRole: expect.any(Function),
      exists: expect.any(Function),
    });

    expect(adapters.conversations.conversations).toMatchObject({
      setAssignee: expect.any(Function),
      getAssignee: expect.any(Function),
      listAssigned: expect.any(Function),
      listUnassigned: expect.any(Function),
    });

    expect(adapters.conversations.events).toMatchObject({
      create: expect.any(Function),
      list: expect.any(Function),
      listByType: expect.any(Function),
    });
  });
});
