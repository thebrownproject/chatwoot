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

function parseDateRange(c: { req: { query: (key: string) => string | undefined } }) {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if (fromDate && isNaN(fromDate.getTime())) return { from: undefined, to: undefined };
  if (toDate && isNaN(toDate.getTime())) return { from: undefined, to: undefined };
  return { from: fromDate, to: toDate };
}

export function createAnalyticsRoutes() {
  const app = new Hono<Env>();

  // GET /analytics/overview
  app.get('/analytics/overview', async (c) => {
    const db = c.get('db');
    const dateRange = parseDateRange(c);

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
  });

  // GET /analytics/conversations
  app.get('/analytics/conversations', async (c) => {
    const db = c.get('db');
    const dateRange = parseDateRange(c);
    const channel = c.req.query('channel');
    const status = c.req.query('status');

    const metrics = await getConversationMetrics(db, {
      ...dateRange,
      channel,
      status,
    });

    return c.json({ data: metrics });
  });

  // GET /analytics/agents
  app.get('/analytics/agents', async (c) => {
    const db = c.get('db');
    const dateRange = parseDateRange(c);

    // Get all agents with assignments in the period
    const agentRows = await db.query<{ assignee_id: string }>(
      `SELECT DISTINCT assignee_id FROM conversations WHERE assignee_id IS NOT NULL`,
      [],
    );

    const agentMetrics = await Promise.all(
      agentRows.map((row) => getAgentMetrics(db, row.assignee_id, dateRange)),
    );

    return c.json({ data: agentMetrics });
  });

  // GET /analytics/agents/:id
  app.get('/analytics/agents/:id', async (c) => {
    const db = c.get('db');
    const agentId = c.req.param('id');
    const dateRange = parseDateRange(c);
    const metrics = await getAgentMetrics(db, agentId, dateRange);
    return c.json({ data: metrics });
  });

  // GET /analytics/teams
  app.get('/analytics/teams', async (c) => {
    const db = c.get('db');
    const dateRange = parseDateRange(c);

    const teamRows = await db.query<{ id: string }>(`SELECT id FROM teams`, []);
    const teamMetrics = await Promise.all(
      teamRows.map((row) => getTeamMetrics(db, row.id, dateRange)),
    );

    return c.json({ data: teamMetrics });
  });

  // GET /analytics/channels
  app.get('/analytics/channels', async (c) => {
    const db = c.get('db');
    const dateRange = parseDateRange(c);
    const metrics = await getChannelMetrics(db, dateRange);
    return c.json({ data: metrics });
  });

  // GET /analytics/sla
  app.get('/analytics/sla', async (c) => {
    const db = c.get('db');
    const dateRange = parseDateRange(c);
    const stats = await getSlaStats(db, dateRange);
    return c.json({ data: stats });
  });

  // GET /analytics/sla/breaches
  app.get('/analytics/sla/breaches', async (c) => {
    const db = c.get('db');
    const breaches = await checkSlaBreaches(db);
    return c.json({ data: breaches });
  });

  return app;
}
