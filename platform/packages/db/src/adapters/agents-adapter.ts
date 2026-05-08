/**
 * Agents adapter — implements agent DB operations using the Drizzle repository.
 *
 * Replaces the in-memory Maps that the agents module was using with proper
 * Drizzle queries against the users + conversations tables. Agent state
 * (active conversations, copilot assignments) is derived from the existing
 * schema rather than duplicated in memory.
 */
import { and, eq } from 'drizzle-orm';

import type { Db } from '../client.js';
import { users } from '../schema/users.js';
import { conversationParticipants } from '../schema/conversations.js';
import type { User, ConversationParticipant } from '../types.js';

export interface AgentsDb {
  /** Find all AI agent users. */
  findAgents(): Promise<User[]>;

  /** Find a specific agent by ID (validates it is type ai_agent). */
  findAgentById(id: string): Promise<User | undefined>;

  /** Find conversations where this agent is a copilot participant. */
  findCopilotAssignments(agentId: string): Promise<ConversationParticipant[]>;

  /** Find conversations where this agent is the assignee (owner). */
  findOwnedConversations(agentId: string): Promise<ConversationParticipant[]>;
}

export class AgentsAdapter implements AgentsDb {
  constructor(private readonly db: Db) {}

  async findAgents(): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(eq(users.type, 'ai_agent'));
  }

  async findAgentById(id: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.type, 'ai_agent')))
      .limit(1);
    return rows[0];
  }

  async findCopilotAssignments(
    agentId: string,
  ): Promise<ConversationParticipant[]> {
    return this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.userId, agentId),
          eq(conversationParticipants.role, 'copilot'),
        ),
      );
  }

  async findOwnedConversations(
    agentId: string,
  ): Promise<ConversationParticipant[]> {
    return this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.userId, agentId),
          eq(conversationParticipants.role, 'assignee'),
        ),
      );
  }
}
