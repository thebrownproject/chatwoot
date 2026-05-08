import type {
  ConversationMetrics,
  AgentMetrics,
  TeamMetrics,
  ChannelMetrics,
  MetricFilters,
  DateRangeFilter,
} from '../types.js';

export interface MetricsDb {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

function buildDateConditions(
  filters: DateRangeFilter | undefined,
  dateColumn: string,
  startParamIdx: number,
): { conditions: string[]; params: unknown[]; nextIdx: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = startParamIdx;

  if (filters?.from) {
    conditions.push(`${dateColumn} >= $${idx}`);
    params.push(filters.from);
    idx++;
  }
  if (filters?.to) {
    conditions.push(`${dateColumn} <= $${idx}`);
    params.push(filters.to);
    idx++;
  }

  return { conditions, params, nextIdx: idx };
}

export async function getConversationMetrics(
  db: MetricsDb,
  filters?: MetricFilters,
): Promise<ConversationMetrics> {
  const { conditions, params, nextIdx } = buildDateConditions(filters, 'c.created_at', 1);
  let paramIdx = nextIdx;

  if (filters?.channel) {
    conditions.push(`c.channel_origin = $${paramIdx}`);
    params.push(filters.channel);
    paramIdx++;
  }
  if (filters?.status) {
    conditions.push(`c.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total + by-status + by-channel in one query using conditional aggregation
  const [totals] = await db.query<{
    total: number;
    open: number;
    pending: number;
    snoozed: number;
    resolved: number;
    avg_first_reply_ms: number | null;
    avg_resolution_ms: number | null;
    resolved_today: number;
    resolved_this_week: number;
    resolved_this_month: number;
  }>(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE c.status = 'open')::int AS open,
      COUNT(*) FILTER (WHERE c.status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE c.status = 'snoozed')::int AS snoozed,
      COUNT(*) FILTER (WHERE c.status = 'resolved')::int AS resolved,
      AVG(EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)) * 1000)
        FILTER (WHERE c.first_reply_at IS NOT NULL) AS avg_first_reply_ms,
      AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) * 1000)
        FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_ms,
      COUNT(*) FILTER (WHERE c.resolved_at >= CURRENT_DATE)::int AS resolved_today,
      COUNT(*) FILTER (WHERE c.resolved_at >= date_trunc('week', CURRENT_DATE))::int AS resolved_this_week,
      COUNT(*) FILTER (WHERE c.resolved_at >= date_trunc('month', CURRENT_DATE))::int AS resolved_this_month
    FROM conversations c
    ${whereClause}`,
    params,
  );

  const channelRows = await db.query<{ channel: string; count: number }>(
    `SELECT c.channel_origin AS channel, COUNT(*)::int AS count
     FROM conversations c
     ${whereClause}
     GROUP BY c.channel_origin`,
    params,
  );

  const byChannel: Record<string, number> = {};
  for (const row of channelRows) {
    byChannel[row.channel] = row.count;
  }

  const row = totals!;
  return {
    total: row.total,
    byStatus: {
      open: row.open,
      pending: row.pending,
      snoozed: row.snoozed,
      resolved: row.resolved,
    },
    byChannel,
    avgFirstReplyMs: row.avg_first_reply_ms,
    avgResolutionMs: row.avg_resolution_ms,
    resolvedToday: row.resolved_today,
    resolvedThisWeek: row.resolved_this_week,
    resolvedThisMonth: row.resolved_this_month,
  };
}

export async function getAgentMetrics(
  db: MetricsDb,
  agentId: string,
  filters?: DateRangeFilter,
): Promise<AgentMetrics> {
  const { conditions, params } = buildDateConditions(filters, 'c.created_at', 2);
  conditions.unshift('c.assignee_id = $1');
  params.unshift(agentId);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [row] = await db.query<{
    assigned: number;
    resolved: number;
    avg_response_ms: number | null;
    current_open: number;
  }>(
    `SELECT
      COUNT(*)::int AS assigned,
      COUNT(*) FILTER (WHERE c.status = 'resolved')::int AS resolved,
      AVG(EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)) * 1000)
        FILTER (WHERE c.first_reply_at IS NOT NULL) AS avg_response_ms,
      COUNT(*) FILTER (WHERE c.status IN ('open', 'pending'))::int AS current_open
    FROM conversations c
    ${whereClause}`,
    params,
  );

  return {
    agentId,
    conversationsAssigned: row?.assigned ?? 0,
    conversationsResolved: row?.resolved ?? 0,
    avgResponseMs: row?.avg_response_ms ?? null,
    currentOpen: row?.current_open ?? 0,
  };
}

export async function getTeamMetrics(
  db: MetricsDb,
  teamId: string,
  filters?: DateRangeFilter,
): Promise<TeamMetrics> {
  const { conditions, params } = buildDateConditions(filters, 'c.created_at', 2);
  params.unshift(teamId);

  const teamCondition = `c.assignee_id IN (SELECT user_id FROM team_members WHERE team_id = $1)`;
  conditions.unshift(teamCondition);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [row] = await db.query<{
    assigned: number;
    resolved: number;
    avg_first_reply_ms: number | null;
    avg_resolution_ms: number | null;
    current_open: number;
  }>(
    `SELECT
      COUNT(*)::int AS assigned,
      COUNT(*) FILTER (WHERE c.status = 'resolved')::int AS resolved,
      AVG(EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)) * 1000)
        FILTER (WHERE c.first_reply_at IS NOT NULL) AS avg_first_reply_ms,
      AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) * 1000)
        FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_ms,
      COUNT(*) FILTER (WHERE c.status IN ('open', 'pending'))::int AS current_open
    FROM conversations c
    ${whereClause}`,
    params,
  );

  return {
    teamId,
    conversationsAssigned: row?.assigned ?? 0,
    conversationsResolved: row?.resolved ?? 0,
    avgFirstReplyMs: row?.avg_first_reply_ms ?? null,
    avgResolutionMs: row?.avg_resolution_ms ?? null,
    currentOpen: row?.current_open ?? 0,
  };
}

export async function getChannelMetrics(
  db: MetricsDb,
  filters?: DateRangeFilter,
): Promise<ChannelMetrics[]> {
  const { conditions, params } = buildDateConditions(filters, 'c.created_at', 1);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.query<ChannelMetrics>(
    `SELECT
      c.channel_origin AS channel,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE c.status IN ('open', 'pending'))::int AS open,
      COUNT(*) FILTER (WHERE c.status = 'resolved')::int AS resolved,
      AVG(EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)) * 1000)
        FILTER (WHERE c.first_reply_at IS NOT NULL) AS "avgFirstReplyMs"
    FROM conversations c
    ${whereClause}
    GROUP BY c.channel_origin`,
    params,
  );
}
