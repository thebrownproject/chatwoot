import { createDb, type Db as Database } from './client.js';
import {
  users,
  permissions,
  channels,
  channelConversations,
  conversations,
  conversationParticipants,
  conversationLabels,
  conversationEvents,
  messages,
  labels,
  cannedResponses,
  teams,
  teamMembers,
  routingRules,
} from './schema/index.js';

/**
 * Creates a Drizzle client for a test database.
 * Reads DATABASE_URL from environment (override with TEST_DATABASE_URL).
 */
export function createTestDb(): Database {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL or DATABASE_URL environment variable is required for tests.',
    );
  }
  return createDb(url);
}

/**
 * Truncates all tables in FK-safe order.
 * Call in beforeEach/afterEach to get a clean slate.
 */
export async function cleanDb(db: Database): Promise<void> {
  // Truncate in reverse-dependency order to respect FK constraints.
  // Join tables and leaf tables first, then parent tables.
  await db.delete(conversationLabels);
  await db.delete(channelConversations);
  await db.delete(conversationEvents);
  await db.delete(messages);
  await db.delete(conversationParticipants);
  await db.delete(teamMembers);
  await db.delete(routingRules);
  await db.delete(cannedResponses);
  await db.delete(permissions);
  await db.delete(conversations);
  await db.delete(channels);
  await db.delete(labels);
  await db.delete(teams);
  await db.delete(users);
}

/**
 * Inserts minimal test fixtures and returns their IDs for assertions.
 */
export async function seedTestData(db: Database) {
  const [agent] = await db
    .insert(users)
    .values({
      type: 'human_agent',
      name: 'Test Agent',
      email: 'agent@test.com',
    })
    .returning();

  const [contact] = await db
    .insert(users)
    .values({
      type: 'contact',
      name: 'Test Contact',
      email: 'contact@test.com',
    })
    .returning();

  const [channel] = await db
    .insert(channels)
    .values({
      type: 'web_chat',
      name: 'Test Chat',
    })
    .returning();

  const [conversation] = await db
    .insert(conversations)
    .values({
      status: 'open',
      channelOrigin: 'web_chat',
      assigneeId: agent.id,
      subject: 'Test conversation',
    })
    .returning();

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      senderId: contact.id,
      body: 'Hello, I need help.',
    })
    .returning();

  return { agent, contact, channel, conversation, message };
}
