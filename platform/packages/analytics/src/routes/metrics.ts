import { Hono } from 'hono';
import {
  getConversationMetrics,
  getAgentMetrics,
  getTeamMetrics,
  getChannelMetrics,
} from '../data/metrics.js';
import { checkSlaBreaches, getSlaStats } from '../data/sla.js';
import type { MetricsDb } from '../data/metrics.js';
import type { SlaDb } from '../data/sla.js';

type Db = MetricsDb & SlaDb;

interface Env {
  Variables: {
    db: Db;
    userId: string;
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDateRange(c: { req: { query: (key: string) => string | undefined } }): {
  from: Date | undefined;
  to: Date | undefined;
  error?: string;
} {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  if (fromDate && isNaN(fromDate.getTime())) {
    return { from: undefined, to: undefined, error: 'Invalid "from" date' };
  }
  if (toDate && isNaN(toDate.getTime())) {
    return { from: undefined, to: undefined, error: 'Invalid "to" date' };
  }
  if (fromDate && toDate && fromDate > toDate) {
    return { from: undefined, to: undefined, error: '"from" must be before "to"' };
  }

  return { from: fromDate, to: toDate };
}

export function createAnalyticsRoutes() {
  const app = new Hono<Env>();

  app.get('/analytics/overview', async (c) => {
    try {
      const db = c.get('db');
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const metrics = await getConversationMetrics(db, dateRange);
      const sla = await getSlaStats(db, dateRange);
      return c.json({
        data: {
          totalConversations: metrics.total,
          avgFirstReplyMs: metrics.avgFirstReplyMs,
          avgResolutionMs: metrics.avgResolutionMs,
          slaComplianceRate: sla.complianceRate,
        },
      });
    } catch {
      return c.json({ error: 'Failed to fetch overview metrics' }, 500);
    }
  });

  app.get('/analytics/conversations', async (c) => {
    try {
      const db = c.get('db');
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const channel = c.req.query('channel');
      const status = c.req.query('status');
      const validStatuses = ['open', 'pending', 'snoozed', 'resolved'];
      if (status && !validStatuses.includes(status)) {
        return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
      }
      const metrics = await getConversationMetrics(db, { ...dateRange, channel, status });
      return c.json({ data: metrics });
    } catch {
      return c.json({ error: 'Failed to fetch conversation metrics' }, 500);
    }
  });

  app.get('/analytics/agents', async (c) => {
    try {
      const db = c.get('db');
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const agentRows = await db.query<{ assignee_id: string }>(
        `SELECT DISTINCT assignee_id FROM conversations WHERE assignee_id IS NOT NULL`,
        [],
      );
      const agentMetrics = await Promise.all(
        agentRows.map((row) => getAgentMetrics(db, row.assignee_id, dateRange)),
      );
      return c.json({ data: agentMetrics });
    } catch {
      return c.json({ error: 'Failed to fetch agent metrics' }, 500);
    }
  });

  app.get('/analytics/agents/:id', async (c) => {
    try {
      const db = c.get('db');
      const agentId = c.req.param('id');
      if (!UUID_RE.test(agentId)) return c.json({ error: 'Invalid agent ID' }, 400);
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const metrics = await getAgentMetrics(db, agentId, dateRange);
      return c.json({ data: metrics });
    } catch {
      return c.json({ error: 'Failed to fetch agent metrics' }, 500);
    }
  });

  app.get('/analytics/teams', async (c) => {
    try {
      const db = c.get('db');
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const teamRows = await db.query<{ id: string }>(`SELECT id FROM teams`, []);
      const teamMetrics = await Promise.all(
        teamRows.map((row) => getTeamMetrics(db, row.id, dateRange)),
      );
      return c.json({ data: teamMetrics });
    } catch {
      return c.json({ error: 'Failed to fetch team metrics' }, 500);
    }
  });

  app.get('/analytics/channels', async (c) => {
    try {
      const db = c.get('db');
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const metrics = await getChannelMetrics(db, dateRange);
      return c.json({ data: metrics });
    } catch {
      return c.json({ error: 'Failed to fetch channel metrics' }, 500);
    }
  });

  app.get('/analytics/sla', async (c) => {
    try {
      const db = c.get('db');
      const dateRange = parseDateRange(c);
      if (dateRange.error) return c.json({ error: dateRange.error }, 400);
      const stats = await getSlaStats(db, dateRange);
      return c.json({ data: stats });
    } catch {
      return c.json({ error: 'Failed to fetch SLA stats' }, 500);
    }
  });

  app.get('/analytics/sla/breaches', async (c) => {
    try {
      const db = c.get('db');
      const breaches = await checkSlaBreaches(db);
      return c.json({ data: breaches });
    } catch {
      return c.json({ error: 'Failed to fetch SLA breaches' }, 500);
    }
  });

  return app;
}
