import { Hono } from 'hono';
import {
  channelTypeEnum,
  createChannelSchema,
  updateChannelSchema,
} from '../types.js';
import {
  createChannel,
  getChannelById,
  listChannels,
  deactivateChannel,
  updateChannel,
  type ChannelDb,
} from '../data/channels.js';

/**
 * Channel CRUD routes.
 *
 * GET    /channels           — list channels (optional ?type=&active= filters)
 * POST   /channels           — create a channel
 * GET    /channels/:id       — get channel by id
 * PATCH  /channels/:id       — update channel
 * DELETE /channels/:id       — deactivate channel (soft delete)
 */
export function channelRoutes(db: ChannelDb): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const rawType = c.req.query('type');
    const active = c.req.query('active');
    const parsedType = rawType ? channelTypeEnum.safeParse(rawType) : undefined;

    const channels = listChannels(db, {
      type: parsedType?.success ? parsedType.data : undefined,
      active: active !== undefined ? active === 'true' : undefined,
    });

    return c.json(channels);
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createChannelSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues }, 400);
    }

    const channel = createChannel(db, {
      id: crypto.randomUUID(),
      ...parsed.data,
    });

    return c.json(channel, 201);
  });

  app.get('/:id', (c) => {
    const channel = getChannelById(db, c.req.param('id'));
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }
    return c.json(channel);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateChannelSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues }, 400);
    }

    const channel = updateChannel(db, c.req.param('id'), parsed.data);
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }
    return c.json(channel);
  });

  app.delete('/:id', (c) => {
    const channel = deactivateChannel(db, c.req.param('id'));
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }
    return c.json(channel);
  });

  return app;
}
