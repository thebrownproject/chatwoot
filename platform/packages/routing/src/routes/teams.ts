import { Hono } from 'hono';
import { z } from 'zod';
import type { RoutingDb } from '../types.js';
import { teamCreateSchema, teamMemberAddSchema } from '../types.js';
import {
  listTeams,
  getTeam,
  createTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from '../data/teams.js';

const uuidSchema = z.string().uuid();

type Env = { Variables: { db: RoutingDb } };

export function teamsRoutes(db: RoutingDb) {
  const app = new Hono<Env>();

  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });

  app.get('/', async (c) => {
    const teams = await listTeams(c.var.db);
    return c.json({ data: teams });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = teamCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const team = await createTeam(c.var.db, parsed.data);
    return c.json({ data: team }, 201);
  });

  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    if (!uuidSchema.safeParse(id).success) {
      return c.json({ error: 'Invalid team ID format' }, 400);
    }
    const team = await getTeam(c.var.db, id);
    if (!team) return c.json({ error: 'Not found' }, 404);
    const members = await getTeamMembers(c.var.db, id);
    return c.json({ data: { ...team, members } });
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    if (!uuidSchema.safeParse(id).success) {
      return c.json({ error: 'Invalid team ID format' }, 400);
    }
    try {
      const deleted = await deleteTeam(c.var.db, id);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.body(null, 204);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot delete team';
      return c.json({ error: message }, 409);
    }
  });

  app.get('/:id/members', async (c) => {
    const teamId = c.req.param('id');
    if (!uuidSchema.safeParse(teamId).success) {
      return c.json({ error: 'Invalid team ID format' }, 400);
    }
    const team = await getTeam(c.var.db, teamId);
    if (!team) return c.json({ error: 'Team not found' }, 404);
    const members = await getTeamMembers(c.var.db, teamId);
    return c.json({ data: members });
  });

  app.post('/:id/members', async (c) => {
    const teamId = c.req.param('id');
    if (!uuidSchema.safeParse(teamId).success) {
      return c.json({ error: 'Invalid team ID format' }, 400);
    }
    const team = await getTeam(c.var.db, teamId);
    if (!team) return c.json({ error: 'Team not found' }, 404);
    const body = await c.req.json();
    const parsed = teamMemberAddSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    try {
      const member = await addTeamMember(
        c.var.db,
        teamId,
        parsed.data.userId,
        parsed.data.role,
      );
      return c.json({ data: member }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot add member';
      return c.json({ error: message }, 409);
    }
  });

  app.delete('/:id/members/:userId', async (c) => {
    const teamId = c.req.param('id');
    const userId = c.req.param('userId');
    const removed = await removeTeamMember(c.var.db, teamId, userId);
    if (!removed) return c.json({ error: 'Not found' }, 404);
    return c.body(null, 204);
  });

  return app;
}
