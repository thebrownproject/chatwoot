/**
 * Analytics adapter — implements the analytics module's MetricsDb interface
 * using Drizzle queries instead of raw SQL.
 *
 * The analytics module previously used `MetricsDb { query<T>(sql, params) }`
 * which bypassed all type safety. This adapter provides the same query
 * capabilities through Drizzle's typed query builder.
 */
import { and, avg, count, eq, gte, lte, sql } from 'drizzle-orm';

import type { Db } from '../client.js';
import { conversations } from '../schema/conversations.js';
import { conversationEvents } from '../schema/conversation-events.js';
import { messages } from '../schema/messages.js';

export interface ConversationMetrics {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  avgFirstReplyMs: number | null;
  avgResolutionMs: number | null;
}

export interface AgentMetrics {
  agentId: string;
  assignedCount: number;
  resolvedCount: number;
  avgFirstReplyMs: number | null;
}

export interface MetricsDb {
  getConversationMetrics(
    from: Date,
    to: Date,
  ): Promise<ConversationMetrics>;

  getAgentMetrics(
    agentId: string,
    from: Date,
    to: Date,
  ): Promise<AgentMetrics>;

  getEventCounts(
    conversationId: string,
  ): Promise<{ eventType: string; count: number }[]>;
}

export class AnalyticsAdapter implements MetricsDb {
  constructor(private readonly db: Db) {}

  async getConversationMetrics(
    from: Date,
    to: Date,
  ): Promise<ConversationMetrics> {
    const dateFilter = and(
      gte(conversations.createdAt, from),
      lte(conversations.createdAt, to),
    );

    const [totals] = await this.db
      .select({
        totalConversations: count(),
        avgFirstReplyMs: avg(
          sql<number>`EXTRACT(EPOCH FROM (${conversations.firstReplyAt} - ${conversations.createdAt})) * 1000`,
        ),
        avgResolutionMs: avg(
          sql<number>`EXTRACT(EPOCH FROM (${conversations.resolvedAt} - ${conversations.createdAt})) * 1000`,
        ),
      })
      .from(conversations)
      .where(dateFilter);

    const [openCount] = await this.db
      .select({ count: count() })
      .from(conversations)
      .where(and(dateFilter, eq(conversations.status, 'open')));

    const [resolvedCount] = await this.db
      .select({ count: count() })
      .from(conversations)
      .where(and(dateFilter, eq(conversations.status, 'resolved')));

    return {
      totalConversations: Number(totals?.totalConversations ?? 0),
      openConversations: Number(openCount?.count ?? 0),
      resolvedConversations: Number(resolvedCount?.count ?? 0),
      avgFirstReplyMs: totals?.avgFirstReplyMs
        ? Number(totals.avgFirstReplyMs)
        : null,
      avgResolutionMs: totals?.avgResolutionMs
        ? Number(totals.avgResolutionMs)
        : null,
    };
  }

  async getAgentMetrics(
    agentId: string,
    from: Date,
    to: Date,
  ): Promise<AgentMetrics> {
    const dateFilter = and(
      gte(conversations.createdAt, from),
      lte(conversations.createdAt, to),
      eq(conversations.assigneeId, agentId),
    );

    const [assigned] = await this.db
      .select({ count: count() })
      .from(conversations)
      .where(dateFilter);

    const [resolved] = await this.db
      .select({ count: count() })
      .from(conversations)
      .where(and(dateFilter, eq(conversations.status, 'resolved')));

    const [avgReply] = await this.db
      .select({
        avgFirstReplyMs: avg(
          sql<number>`EXTRACT(EPOCH FROM (${conversations.firstReplyAt} - ${conversations.createdAt})) * 1000`,
        ),
      })
      .from(conversations)
      .where(dateFilter);

    return {
      agentId,
      assignedCount: Number(assigned?.count ?? 0),
      resolvedCount: Number(resolved?.count ?? 0),
      avgFirstReplyMs: avgReply?.avgFirstReplyMs
        ? Number(avgReply.avgFirstReplyMs)
        : null,
    };
  }

  async getEventCounts(
    conversationId: string,
  ): Promise<{ eventType: string; count: number }[]> {
    const rows = await this.db
      .select({
        eventType: conversationEvents.eventType,
        count: count(),
      })
      .from(conversationEvents)
      .where(eq(conversationEvents.conversationId, conversationId))
      .groupBy(conversationEvents.eventType);

    return rows.map((r) => ({
      eventType: r.eventType,
      count: Number(r.count),
    }));
  }
}
