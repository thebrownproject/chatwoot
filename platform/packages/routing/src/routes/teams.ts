import { Hono } from 'hono';
import type { RoutingDb } from '../types.js';
import { teamCreateSchema, teamMemberAddSchema } from '../types.js';
import {
  listTeams,
  getTeam,
  createTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from '../data/teams.js';

type Env = { Variables: { db: RoutingDb } };

export function teamsRoutes(db: RoutingDb) {
  const app = new Hono<Env>();

  // Inject db into context
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });

  /** GET /teams — list all teams */
  app.get('/', async (c) => {
    const teams = await listTeams(c.var.db);
    return c.json(teams);
  });

  /** POST /teams — create a team */
  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = teamCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const team = await createTeam(c.var.db, parsed.data);
    return c.json(team, 201);
  });

  /** GET /teams/:id — get a team with its members */
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const team = await getTeam(c.var.db, id);
    if (!team) return c.json({ error: 'Not found' }, 404);
    const members = await getTeamMembers(c.var.db, id);
    return c.json({ ...team, members });
  });

  /** GET /teams/:id/members — list team members */
  app.get('/:id/members', async (c) => {
    const teamId = c.req.param('id');
    const members = await getTeamMembers(c.var.db, teamId);
    return c.json({ data: members });
  });

  /** POST /teams/:id/members — add a member to a team */
  app.post('/:id/members', async (c) => {
    const teamId = c.req.param('id');
    const body = await c.req.json();
    const parsed = teamMemberAddSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const member = await addTeamMember(
      c.var.db,
      teamId,
      parsed.data.userId,
      parsed.data.role,
    );
    return c.json(member, 201);
  });

  /** DELETE /teams/:id/members/:userId — remove a member */
  app.delete('/:id/members/:userId', async (c) => {
    const teamId = c.req.param('id');
    const userId = c.req.param('userId');
    const removed = await removeTeamMember(c.var.db, teamId, userId);
    if (!removed) return c.json({ error: 'Not found' }, 404);
    return c.body(null, 204);
  });

  return app;
}
