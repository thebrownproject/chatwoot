import type { SlaBreach, SlaStats, DateRangeFilter } from '../types.js';
import { SLA_DEFAULTS } from '../types.js';

export interface SlaDb {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Find conversations that have breached SLA thresholds.
 *
 * First reply SLA: conversations where first_reply_at is null
 * AND created_at is more than X ms ago.
 *
 * Resolution SLA: open conversations older than Y ms.
 */
export async function checkSlaBreaches(
  db: SlaDb,
  options?: {
    firstReplyMs?: number | undefined;
    resolutionMs?: number | undefined;
  },
): Promise<SlaBreach[]> {
  const firstReplyMs = options?.firstReplyMs ?? SLA_DEFAULTS.FIRST_REPLY_MS;
  const resolutionMs = options?.resolutionMs ?? SLA_DEFAULTS.RESOLUTION_MS;

  if (firstReplyMs <= 0 || resolutionMs <= 0) {
    throw new Error('SLA thresholds must be positive numbers');
  }
  if (!Number.isFinite(firstReplyMs) || !Number.isFinite(resolutionMs)) {
    throw new Error('SLA thresholds must be finite numbers');
  }

  const now = new Date();

  const firstReplyThreshold = new Date(now.getTime() - firstReplyMs);
  const resolutionThreshold = new Date(now.getTime() - resolutionMs);

  // First reply breaches: no reply yet and past threshold
  const firstReplyBreaches = await db.query<{
    conversation_id: string;
    created_at: Date;
    elapsed_ms: number;
  }>(
    `SELECT
      c.id AS conversation_id,
      c.created_at,
      EXTRACT(EPOCH FROM ($1::timestamptz - c.created_at)) * 1000 AS elapsed_ms
    FROM conversations c
    WHERE c.first_reply_at IS NULL
      AND c.status IN ('open', 'pending')
      AND c.created_at <= $2`,
    [now, firstReplyThreshold],
  );

  // Resolution breaches: still open past threshold
  const resolutionBreaches = await db.query<{
    conversation_id: string;
    created_at: Date;
    elapsed_ms: number;
  }>(
    `SELECT
      c.id AS conversation_id,
      c.created_at,
      EXTRACT(EPOCH FROM ($1::timestamptz - c.created_at)) * 1000 AS elapsed_ms
    FROM conversations c
    WHERE c.resolved_at IS NULL
      AND c.status IN ('open', 'pending', 'snoozed')
      AND c.created_at <= $2`,
    [now, resolutionThreshold],
  );

  const breaches: SlaBreach[] = [];

  for (const row of firstReplyBreaches) {
    breaches.push({
      conversationId: row.conversation_id,
      type: 'first_reply',
      breachedAt: new Date(new Date(row.created_at).getTime() + firstReplyMs),
      thresholdMs: firstReplyMs,
      actualMs: row.elapsed_ms,
    });
  }

  for (const row of resolutionBreaches) {
    breaches.push({
      conversationId: row.conversation_id,
      type: 'resolution',
      breachedAt: new Date(new Date(row.created_at).getTime() + resolutionMs),
      thresholdMs: resolutionMs,
      actualMs: row.elapsed_ms,
    });
  }

  return breaches;
}

/**
 * SLA compliance rate for a period.
 * Checks all conversations created in the period and calculates
 * what percentage met both first-reply and resolution SLAs.
 */
export async function getSlaStats(
  db: SlaDb,
  period?: DateRangeFilter,
  options?: {
    firstReplyMs?: number | undefined;
    resolutionMs?: number | undefined;
  },
): Promise<SlaStats> {
  const firstReplyMs = options?.firstReplyMs ?? SLA_DEFAULTS.FIRST_REPLY_MS;
  const resolutionMs = options?.resolutionMs ?? SLA_DEFAULTS.RESOLUTION_MS;

  if (firstReplyMs <= 0 || resolutionMs <= 0) {
    throw new Error('SLA thresholds must be positive numbers');
  }
  if (!Number.isFinite(firstReplyMs) || !Number.isFinite(resolutionMs)) {
    throw new Error('SLA thresholds must be finite numbers');
  }

  const conditions: string[] = [];
  const params: unknown[] = [firstReplyMs / 1000, resolutionMs / 1000];
  let paramIdx = 3;

  if (period?.from) {
    conditions.push(`c.created_at >= $${paramIdx}`);
    params.push(period.from);
    paramIdx++;
  }
  if (period?.to) {
    conditions.push(`c.created_at <= $${paramIdx}`);
    params.push(period.to);
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  const [row] = await db.query<{
    total: number;
    first_reply_breaches: number;
    resolution_breaches: number;
  }>(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE c.first_reply_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)) > $1
      )::int AS first_reply_breaches,
      COUNT(*) FILTER (
        WHERE c.resolved_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) > $2
      )::int AS resolution_breaches
    FROM conversations c
    WHERE c.status IS NOT NULL ${whereClause}`,
    params,
  );

  const total = row?.total ?? 0;
  const firstReplyBreaches = row?.first_reply_breaches ?? 0;
  const resolutionBreachCount = row?.resolution_breaches ?? 0;
  const totalBreaches = firstReplyBreaches + resolutionBreachCount;

  return {
    totalChecked: total,
    firstReplyBreaches,
    resolutionBreaches: resolutionBreachCount,
    complianceRate: total > 0 ? Math.round(((total * 2 - totalBreaches) / (total * 2)) * 10000) / 100 : 100,
  };
}
