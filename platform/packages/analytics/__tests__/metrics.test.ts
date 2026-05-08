import { describe, it, expect } from 'vitest';
import {
  getConversationMetrics,
  getAgentMetrics,
  getChannelMetrics,
} from '../src/data/metrics.js';
import type { MetricsDb } from '../src/data/metrics.js';

interface MockConversation {
  id: string;
  status: string;
  channel_origin: string;
  assignee_id: string | null;
  created_at: Date;
  first_reply_at: Date | null;
  resolved_at: Date | null;
}

/**
 * Build an in-memory mock DB that answers the SQL queries the metrics module uses.
 */
function createMockDb(conversations: MockConversation[]): MetricsDb {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      let filtered = [...conversations];

      // Apply date filters from params if present
      // For now, the mock returns based on the full set

      if (sql.includes('COUNT(*)') && sql.includes('avg_first_reply_ms')) {
        // getConversationMetrics aggregate query
        const total = filtered.length;
        const open = filtered.filter((c) => c.status === 'open').length;
        const pending = filtered.filter((c) => c.status === 'pending').length;
        const snoozed = filtered.filter((c) => c.status === 'snoozed').length;
        const resolved = filtered.filter((c) => c.status === 'resolved').length;

        const withFirstReply = filtered.filter((c) => c.first_reply_at !== null);
        const avgFirstReply = withFirstReply.length > 0
          ? withFirstReply.reduce((sum, c) => sum + (c.first_reply_at!.getTime() - c.created_at.getTime()), 0) / withFirstReply.length
          : null;

        const withResolved = filtered.filter((c) => c.resolved_at !== null);
        const avgResolution = withResolved.length > 0
          ? withResolved.reduce((sum, c) => sum + (c.resolved_at!.getTime() - c.created_at.getTime()), 0) / withResolved.length
          : null;

        const resolvedToday = filtered.filter((c) => c.resolved_at && c.resolved_at >= startOfDay).length;
        const resolvedThisWeek = filtered.filter((c) => c.resolved_at && c.resolved_at >= startOfWeek).length;
        const resolvedThisMonth = filtered.filter((c) => c.resolved_at && c.resolved_at >= startOfMonth).length;

        return [{
          total,
          open,
          pending,
          snoozed,
          resolved,
          avg_first_reply_ms: avgFirstReply,
          avg_resolution_ms: avgResolution,
          resolved_today: resolvedToday,
          resolved_this_week: resolvedThisWeek,
          resolved_this_month: resolvedThisMonth,
        }] as T[];
      }

      if (sql.includes('channel_origin AS channel') && sql.includes('GROUP BY')) {
        // Channel grouping query
        const channelMap = new Map<string, number>();
        for (const c of filtered) {
          channelMap.set(c.channel_origin, (channelMap.get(c.channel_origin) ?? 0) + 1);
        }

        if (sql.includes('AS total')) {
          // getChannelMetrics
          const results = [];
          for (const [channel, total] of channelMap) {
            const channelConvs = filtered.filter((c) => c.channel_origin === channel);
            const openCount = channelConvs.filter((c) => c.status === 'open' || c.status === 'pending').length;
            const resolvedCount = channelConvs.filter((c) => c.status === 'resolved').length;
            const withFirstReply = channelConvs.filter((c) => c.first_reply_at !== null);
            const avgFirstReply = withFirstReply.length > 0
              ? withFirstReply.reduce((sum, c) => sum + (c.first_reply_at!.getTime() - c.created_at.getTime()), 0) / withFirstReply.length
              : null;
            results.push({ channel, total, open: openCount, resolved: resolvedCount, avgFirstReplyMs: avgFirstReply });
          }
          return results as T[];
        }

        // Simple channel count query (for getConversationMetrics byChannel)
        const results = [];
        for (const [channel, count] of channelMap) {
          results.push({ channel, count });
        }
        return results as T[];
      }

      if (sql.includes('assignee_id = $1') && sql.includes('COUNT(*)')) {
        // getAgentMetrics
        const [agentId] = params as [string];
        const agentConvs = filtered.filter((c) => c.assignee_id === agentId);
        const assigned = agentConvs.length;
        const resolvedCount = agentConvs.filter((c) => c.status === 'resolved').length;
        const withFirstReply = agentConvs.filter((c) => c.first_reply_at !== null);
        const avgResponse = withFirstReply.length > 0
          ? withFirstReply.reduce((sum, c) => sum + (c.first_reply_at!.getTime() - c.created_at.getTime()), 0) / withFirstReply.length
          : null;
        const currentOpen = agentConvs.filter((c) => c.status === 'open' || c.status === 'pending').length;

        return [{
          assigned,
          resolved: resolvedCount,
          avg_response_ms: avgResponse,
          current_open: currentOpen,
        }] as T[];
      }

      return [] as T[];
    },
  };
}

describe('analytics metrics', () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const sampleConversations: MockConversation[] = [
    {
      id: 'conv-1',
      status: 'resolved',
      channel_origin: 'web_chat',
      assignee_id: 'agent-1',
      created_at: twoHoursAgo,
      first_reply_at: new Date(twoHoursAgo.getTime() + 3 * 60 * 1000), // 3 min reply
      resolved_at: now,
    },
    {
      id: 'conv-2',
      status: 'open',
      channel_origin: 'email',
      assignee_id: 'agent-1',
      created_at: oneHourAgo,
      first_reply_at: new Date(oneHourAgo.getTime() + 10 * 60 * 1000), // 10 min reply
      resolved_at: null,
    },
    {
      id: 'conv-3',
      status: 'open',
      channel_origin: 'web_chat',
      assignee_id: 'agent-2',
      created_at: thirtyMinAgo,
      first_reply_at: null,
      resolved_at: null,
    },
    {
      id: 'conv-4',
      status: 'pending',
      channel_origin: 'email',
      assignee_id: null,
      created_at: oneHourAgo,
      first_reply_at: null,
      resolved_at: null,
    },
  ];

  it('calculates total conversation metrics', async () => {
    const db = createMockDb(sampleConversations);
    const metrics = await getConversationMetrics(db);

    expect(metrics.total).toBe(4);
    expect(metrics.byStatus.open).toBe(2);
    expect(metrics.byStatus.resolved).toBe(1);
    expect(metrics.byStatus.pending).toBe(1);
    expect(metrics.byStatus.snoozed).toBe(0);
  });

  it('calculates channel breakdown', async () => {
    const db = createMockDb(sampleConversations);
    const metrics = await getConversationMetrics(db);

    expect(metrics.byChannel['web_chat']).toBe(2);
    expect(metrics.byChannel['email']).toBe(2);
  });

  it('calculates average first reply time', async () => {
    const db = createMockDb(sampleConversations);
    const metrics = await getConversationMetrics(db);

    // 2 conversations with first_reply: 3min and 10min = avg 6.5 min = 390000ms
    expect(metrics.avgFirstReplyMs).toBeCloseTo(390000, -2);
  });

  it('returns null for avg resolution when none resolved', async () => {
    const noResolved = sampleConversations.map((c) => ({ ...c, resolved_at: null, status: 'open' }));
    const db = createMockDb(noResolved);
    const metrics = await getConversationMetrics(db);

    expect(metrics.avgResolutionMs).toBeNull();
  });

  it('calculates agent metrics', async () => {
    const db = createMockDb(sampleConversations);
    const metrics = await getAgentMetrics(db, 'agent-1');

    expect(metrics.agentId).toBe('agent-1');
    expect(metrics.conversationsAssigned).toBe(2);
    expect(metrics.conversationsResolved).toBe(1);
    expect(metrics.currentOpen).toBe(1);
    expect(metrics.avgResponseMs).not.toBeNull();
  });

  it('returns zeros for agent with no conversations', async () => {
    const db = createMockDb(sampleConversations);
    const metrics = await getAgentMetrics(db, 'agent-999');

    expect(metrics.conversationsAssigned).toBe(0);
    expect(metrics.conversationsResolved).toBe(0);
    expect(metrics.avgResponseMs).toBeNull();
    expect(metrics.currentOpen).toBe(0);
  });

  it('calculates channel metrics', async () => {
    const db = createMockDb(sampleConversations);
    const metrics = await getChannelMetrics(db);

    expect(metrics).toHaveLength(2);

    const webChat = metrics.find((m) => m.channel === 'web_chat');
    expect(webChat).toBeDefined();
    expect(webChat!.total).toBe(2);
    expect(webChat!.resolved).toBe(1);
    expect(webChat!.open).toBe(1);

    const email = metrics.find((m) => m.channel === 'email');
    expect(email).toBeDefined();
    expect(email!.total).toBe(2);
    expect(email!.open).toBe(2);
  });
});
