import { Hono } from 'hono';
import {
  createWidgetConversationSchema,
  createWidgetMessageSchema,
} from '../types.js';

/**
 * Widget API routes — PUBLIC, no auth required.
 *
 * These are the endpoints the web chat widget calls directly.
 * In production, the widget embeds a channelId (widget key) that maps
 * to a web_chat channel.
 *
 * POST /widget/conversations                   — start a new conversation
 * GET  /widget/conversations/:id/messages      — fetch messages
 * POST /widget/conversations/:id/messages      — send a message
 */

/** Simple in-memory stores for MVP. Replace with db queries. */
interface WidgetConversation {
  id: string;
  channelId: string;
  contactName: string;
  contactEmail?: string | undefined;
  createdAt: string;
}

interface WidgetMessage {
  id: string;
  conversationId: string;
  body: string;
  senderName: string;
  senderType: 'contact' | 'agent';
  createdAt: string;
}

export interface WidgetStore {
  conversations: Map<string, WidgetConversation>;
  messages: Map<string, WidgetMessage[]>;
}

export function createWidgetStore(): WidgetStore {
  return {
    conversations: new Map(),
    messages: new Map(),
  };
}

export function widgetRoutes(store: WidgetStore): Hono {
  const app = new Hono();

  app.post('/conversations', async (c) => {
    const body = await c.req.json();
    const parsed = createWidgetConversationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }

    const id = crypto.randomUUID();
    const conversation: WidgetConversation = {
      id,
      channelId: parsed.data.channelId,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      createdAt: new Date().toISOString(),
    };
    store.conversations.set(id, conversation);
    store.messages.set(id, []);

    if (parsed.data.initialMessage) {
      const msg: WidgetMessage = {
        id: crypto.randomUUID(),
        conversationId: id,
        body: parsed.data.initialMessage,
        senderName: parsed.data.contactName,
        senderType: 'contact',
        createdAt: new Date().toISOString(),
      };
      const messages = store.messages.get(id);
      if (messages) messages.push(msg);
    }

    return c.json({ data: conversation }, 201);
  });

  app.get('/conversations/:id/messages', (c) => {
    const conversationId = c.req.param('id');
    const conversation = store.conversations.get(conversationId);
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = store.messages.get(conversationId) ?? [];
    return c.json({ data: messages });
  });

  app.post('/conversations/:id/messages', async (c) => {
    const conversationId = c.req.param('id');
    const conversation = store.conversations.get(conversationId);
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const body = await c.req.json();
    const parsed = createWidgetMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }

    const msg: WidgetMessage = {
      id: crypto.randomUUID(),
      conversationId,
      body: parsed.data.body,
      senderName: parsed.data.senderName ?? conversation.contactName,
      senderType: 'contact',
      createdAt: new Date().toISOString(),
    };

    const messages = store.messages.get(conversationId);
    if (messages) {
      messages.push(msg);
    } else {
      store.messages.set(conversationId, [msg]);
    }

    return c.json({ data: msg }, 201);
  });

  return app;
}
