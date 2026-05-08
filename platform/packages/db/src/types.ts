/**
 * Canonical type definitions for all platform entities.
 *
 * Every module should import types from `@buildpass/db` rather than
 * redefining its own User/Conversation/Message shapes. This is the
 * single source of truth derived from the Drizzle schema via
 * `InferSelectModel` / `InferInsertModel`.
 */
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

import type { users } from './schema/users.js';
import type { permissions } from './schema/permissions.js';
import type {
  conversations,
  conversationParticipants,
} from './schema/conversations.js';
import type { conversationEvents } from './schema/conversation-events.js';
import type { messages } from './schema/messages.js';
import type { labels, conversationLabels } from './schema/labels.js';
import type { cannedResponses } from './schema/canned-responses.js';
import type { channels, channelConversations } from './schema/channels.js';
import type { teams, teamMembers } from './schema/teams.js';
import type { routingRules } from './schema/routing-rules.js';

// ── Users ──────────────────────────────────────────────────────────
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// ── Permissions ────────────────────────────────────────────────────
export type Permission = InferSelectModel<typeof permissions>;
export type NewPermission = InferInsertModel<typeof permissions>;

// ── Conversations ──────────────────────────────────────────────────
export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

export type ConversationParticipant = InferSelectModel<
  typeof conversationParticipants
>;
export type NewConversationParticipant = InferInsertModel<
  typeof conversationParticipants
>;

// ── Conversation Events ────────────────────────────────────────────
export type ConversationEvent = InferSelectModel<typeof conversationEvents>;
export type NewConversationEvent = InferInsertModel<typeof conversationEvents>;

// ── Messages ───────────────────────────────────────────────────────
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

// ── Labels ─────────────────────────────────────────────────────────
export type Label = InferSelectModel<typeof labels>;
export type NewLabel = InferInsertModel<typeof labels>;

export type ConversationLabel = InferSelectModel<typeof conversationLabels>;
export type NewConversationLabel = InferInsertModel<typeof conversationLabels>;

// ── Canned Responses ───────────────────────────────────────────────
export type CannedResponse = InferSelectModel<typeof cannedResponses>;
export type NewCannedResponse = InferInsertModel<typeof cannedResponses>;

// ── Channels ───────────────────────────────────────────────────────
export type Channel = InferSelectModel<typeof channels>;
export type NewChannel = InferInsertModel<typeof channels>;

export type ChannelConversation = InferSelectModel<typeof channelConversations>;
export type NewChannelConversation = InferInsertModel<
  typeof channelConversations
>;

// ── Teams ──────────────────────────────────────────────────────────
export type Team = InferSelectModel<typeof teams>;
export type NewTeam = InferInsertModel<typeof teams>;

export type TeamMember = InferSelectModel<typeof teamMembers>;
export type NewTeamMember = InferInsertModel<typeof teamMembers>;

// ── Routing Rules ──────────────────────────────────────────────────
export type RoutingRule = InferSelectModel<typeof routingRules>;
export type NewRoutingRule = InferInsertModel<typeof routingRules>;
