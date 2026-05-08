import { Hono } from 'hono';
import {
  listPendingSuggestions,
  acceptSuggestion,
  dismissSuggestion,
} from '../copilot.js';
import type { DbClient } from '../types.js';

// ---------------------------------------------------------------------------
// Route type
// ---------------------------------------------------------------------------

type Env = { Variables: { db: DbClient } };

/**
 * Copilot routes as a Hono app.
 * Mount with `app.route('/conversations', copilotRoutes)`.
 *
 * Expects a `db` variable set via middleware.
 */
export const copilotRoutes = new Hono<Env>();

// ---------------------------------------------------------------------------
// GET /conversations/:id/suggestions — list pending copilot suggestions
// ---------------------------------------------------------------------------

copilotRoutes.get('/:id/suggestions', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');

  const suggestions = await listPendingSuggestions(db, conversationId);
  return c.json({ data: suggestions });
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/suggestions/:suggestionId/accept
// ---------------------------------------------------------------------------

copilotRoutes.post('/:id/suggestions/:suggestionId/accept', async (c) => {
  const db = c.get('db');
  const suggestionId = c.req.param('suggestionId');

  let edits: string | undefined;
  try {
    const body = await c.req.json();
    if (body && typeof body.edits === 'string') {
      edits = body.edits;
    }
  } catch {
    // No body is fine — accept as-is
  }

  const suggestion = await acceptSuggestion(db, suggestionId, edits);
  if (!suggestion) {
    return c.json({ error: 'Suggestion not found or already actioned' }, 404);
  }

  return c.json(suggestion);
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/suggestions/:suggestionId/dismiss
// ---------------------------------------------------------------------------

copilotRoutes.post('/:id/suggestions/:suggestionId/dismiss', async (c) => {
  const db = c.get('db');
  const suggestionId = c.req.param('suggestionId');

  const suggestion = await dismissSuggestion(db, suggestionId);
  if (!suggestion) {
    return c.json({ error: 'Suggestion not found or already actioned' }, 404);
  }

  return c.json(suggestion);
});
