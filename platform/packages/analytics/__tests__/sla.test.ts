import { describe, it, expect } from 'vitest';
import { checkSlaBreaches, getSlaStats } from '../src/data/sla.js';
import type { SlaDb } from '../src/data/sla.js';
import { SLA_DEFAULTS } from '../src/types.js';

interface MockConversation {
  id: string;
  status: string;
  created_at: Date;
  first_reply_at: Date | null;
  resolved_at: Date | null;
}

function createMockDb(conversations: MockConversation[]): SlaDb {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const now = params?.[0] as Date ?? new Date();

      if (sql.includes('first_reply_at IS NULL') && !sql.includes('COUNT(*)')) {
        // checkSlaBreaches: first reply breaches
        const threshold = params?.[1] as Date;
        const breached = conversations.filter(
          (c) =>
            c.first_reply_at === null &&
            (c.status === 'open' || c.status === 'pending') &&
            c.created_at <= threshold,
        );
        return breached.map((c) => ({
          conversation_id: c.id,
          created_at: c.created_at,
          elapsed_ms: now.getTime() - c.created_at.getTime(),
        })) as T[];
      }

      if (sql.includes('resolved_at IS NULL') && !sql.includes('COUNT(*)')) {
        // checkSlaBreaches: resolution breaches
        const threshold = params?.[1] as Date;
        const breached = conversations.filter(
          (c) =>
            c.resolved_at === null &&
            (c.status === 'open' || c.status === 'pending' || c.status === 'snoozed') &&
            c.created_at <= threshold,
        );
        return breached.map((c) => ({
          conversation_id: c.id,
          created_at: c.created_at,
          elapsed_ms: now.getTime() - c.created_at.getTime(),
        })) as T[];
      }

      if (sql.includes('COUNT(*)') && sql.includes('first_reply_breaches')) {
        // getSlaStats
        const firstReplySlaSeconds = params?.[0] as number;
        const resolutionSlaSeconds = params?.[1] as number;
        const total = conversations.length;

        const firstReplyBreaches = conversations.filter((c) => {
          if (!c.first_reply_at) return false;
          const replyTimeSec = (c.first_reply_at.getTime() - c.created_at.getTime()) / 1000;
          return replyTimeSec > firstReplySlaSeconds;
        }).length;

        const resolutionBreaches = conversations.filter((c) => {
          if (!c.resolved_at) return false;
          const resTimeSec = (c.resolved_at.getTime() - c.created_at.getTime()) / 1000;
          return resTimeSec > resolutionSlaSeconds;
        }).length;

        return [{
          total,
          first_reply_breaches: firstReplyBreaches,
          resolution_breaches: resolutionBreaches,
        }] as T[];
      }

      return [] as T[];
    },
  };
}

describe('SLA breach detection', () => {
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);
  const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

  it('detects first reply SLA breaches', async () => {
    const conversations: MockConversation[] = [
      {
        id: 'conv-1',
        status: 'open',
        created_at: tenMinAgo,
        first_reply_at: null, // No reply for 10 min (> 5 min SLA)
        resolved_at: null,
      },
      {
        id: 'conv-2',
        status: 'open',
        created_at: twoMinAgo,
        first_reply_at: null, // No reply for 2 min (< 5 min SLA) — NOT a breach
        resolved_at: null,
      },
    ];

    const db = createMockDb(conversations);
    const breaches = await checkSlaBreaches(db);

    const firstReplyBreaches = breaches.filter((b) => b.type === 'first_reply');
    expect(firstReplyBreaches).toHaveLength(1);
    expect(firstReplyBreaches[0]!.conversationId).toBe('conv-1');
    expect(firstReplyBreaches[0]!.thresholdMs).toBe(SLA_DEFAULTS.FIRST_REPLY_MS);
  });

  it('detects resolution SLA breaches', async () => {
    const conversations: MockConversation[] = [
      {
        id: 'conv-1',
        status: 'open',
        created_at: twentyFiveHoursAgo,
        first_reply_at: new Date(twentyFiveHoursAgo.getTime() + 60000),
        resolved_at: null, // Open for 25 hours (> 24h SLA)
      },
      {
        id: 'conv-2',
        status: 'open',
        created_at: tenMinAgo,
        first_reply_at: new Date(tenMinAgo.getTime() + 60000),
        resolved_at: null, // Open for 10 min (< 24h SLA)
      },
    ];

    const db = createMockDb(conversations);
    const breaches = await checkSlaBreaches(db);

    const resolutionBreaches = breaches.filter((b) => b.type === 'resolution');
    expect(resolutionBreaches).toHaveLength(1);
    expect(resolutionBreaches[0]!.conversationId).toBe('conv-1');
    expect(resolutionBreaches[0]!.thresholdMs).toBe(SLA_DEFAULTS.RESOLUTION_MS);
  });

  it('uses custom SLA thresholds', async () => {
    const conversations: MockConversation[] = [
      {
        id: 'conv-1',
        status: 'open',
        created_at: twoMinAgo,
        first_reply_at: null, // 2 min with no reply
        resolved_at: null,
      },
    ];

    const db = createMockDb(conversations);

    // With 1 minute SLA, this should be a breach
    const breaches = await checkSlaBreaches(db, { firstReplyMs: 60 * 1000 });
    const firstReplyBreaches = breaches.filter((b) => b.type === 'first_reply');
    expect(firstReplyBreaches).toHaveLength(1);
  });

  it('returns no breaches when all conversations are within SLA', async () => {
    const conversations: MockConversation[] = [
      {
        id: 'conv-1',
        status: 'open',
        created_at: twoMinAgo,
        first_reply_at: new Date(twoMinAgo.getTime() + 60000), // replied in 1 min
        resolved_at: null,
      },
    ];

    const db = createMockDb(conversations);
    const breaches = await checkSlaBreaches(db);

    // No first-reply breach (replied in 1 min), no resolution breach (only 2 min old)
    expect(breaches.filter((b) => b.type === 'first_reply')).toHaveLength(0);
  });
});

describe('SLA stats', () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  it('calculates SLA compliance rate', async () => {
    const conversations: MockConversation[] = [
      {
        id: 'conv-1',
        status: 'resolved',
        created_at: oneHourAgo,
        first_reply_at: new Date(oneHourAgo.getTime() + 2 * 60 * 1000), // 2 min (within 5 min SLA)
        resolved_at: new Date(oneHourAgo.getTime() + 30 * 60 * 1000), // 30 min (within 24h SLA)
      },
      {
        id: 'conv-2',
        status: 'resolved',
        created_at: oneHourAgo,
        first_reply_at: new Date(oneHourAgo.getTime() + 10 * 60 * 1000), // 10 min (BREACHED 5 min SLA)
        resolved_at: new Date(oneHourAgo.getTime() + 20 * 60 * 1000), // 20 min (within 24h SLA)
      },
    ];

    const db = createMockDb(conversations);
    const stats = await getSlaStats(db);

    expect(stats.totalChecked).toBe(2);
    expect(stats.firstReplyBreaches).toBe(1);
    expect(stats.resolutionBreaches).toBe(0);
    // 2 conversations * 2 checks = 4 total checks, 1 breach => (4-1)/4 = 75%
    expect(stats.complianceRate).toBe(75);
  });

  it('returns 100% compliance when no conversations exist', async () => {
    const db = createMockDb([]);
    const stats = await getSlaStats(db);

    expect(stats.totalChecked).toBe(0);
    expect(stats.complianceRate).toBe(100);
  });

  it('returns 100% compliance when all within SLA', async () => {
    const conversations: MockConversation[] = [
      {
        id: 'conv-1',
        status: 'resolved',
        created_at: oneHourAgo,
        first_reply_at: new Date(oneHourAgo.getTime() + 60 * 1000), // 1 min
        resolved_at: new Date(oneHourAgo.getTime() + 10 * 60 * 1000), // 10 min
      },
    ];

    const db = createMockDb(conversations);
    const stats = await getSlaStats(db);

    expect(stats.complianceRate).toBe(100);
    expect(stats.firstReplyBreaches).toBe(0);
    expect(stats.resolutionBreaches).toBe(0);
  });
});
