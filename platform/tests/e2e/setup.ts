/**
 * E2E test setup — in-memory implementations of all platform modules.
 *
 * Each module is reimplemented as a lightweight in-memory store that matches
 * the interface of the real module. Tests import from here and wire modules
 * together like the real app would.
 */

import { randomUUID } from 'node:crypto';

// ============================================================================
// Types (mirrored from module type files)
// ============================================================================

export type UserType = 'human_agent' | 'ai_agent' | 'contact' | 'system';
export type ConversationStatus = 'open' | 'pending' | 'snoozed' | 'resolved';
export type ChannelOrigin = 'email' | 'web_chat' | 'sms' | 'slack' | 'in_app';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type MessageVisibility = 'public' | 'internal';
export type MessageType = 'text' | 'rich' | 'activity';
export type ParticipantRole = 'contact' | 'assignee' | 'observer' | 'copilot';
export type ArticleStatus = 'draft' | 'published' | 'archived';
export type NotificationType =
  | 'new_message'
  | 'assignment'
  | 'mention'
  | 'status_change'
  | 'escalation';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';
export type AssignmentAction = 'assign_agent' | 'assign_team' | 'assign_bot';
export type TargetType = 'user' | 'team';
export type TeamMemberRole = 'lead' | 'member';

// ============================================================================
// Record types
// ============================================================================

export interface User {
  id: string;
  type: UserType;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  displayId: number;
  status: ConversationStatus;
  channelOrigin: ChannelOrigin;
  assigneeId: string | null;
  subject: string | null;
  priority: Priority;
  snoozedUntil: Date | null;
  firstReplyAt: Date | null;
  resolvedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  visibility: MessageVisibility;
  body: string;
  bodyHtml: string | null;
  metadata: Record<string, unknown>;
  attachments: Array<{
    url: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface ConversationEvent {
  id: string;
  conversationId: string;
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface Label {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
}

export interface ConversationLabel {
  conversationId: string;
  labelId: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  bodyHtml: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  type: ChannelOrigin;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelConversation {
  id: string;
  channelId: string;
  conversationId: string;
  externalId: string;
  externalMetadata: Record<string, unknown>;
}

export interface Team {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  createdAt: Date;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    channel?: ChannelOrigin;
    labels?: string[];
    keywords?: string[];
  };
  action: AssignmentAction;
  targetType: TargetType;
  targetId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CopilotSuggestion {
  id: string;
  conversationId: string;
  agentId: string;
  suggestedReply: string;
  confidence: number;
  reasoning: string;
  status: SuggestionStatus;
  createdAt: Date;
}

export interface HandoffRequest {
  id: string;
  fromAgentId: string;
  toUserId: string | null;
  conversationId: string;
  reason: string;
  contextSummary: string;
  createdAt: Date;
}

export interface Portal {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  portalId: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  parentCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: string;
  portalId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  content: string;
  contentHtml: string | null;
  status: ArticleStatus;
  authorId: string;
  position: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  conversationId: string | null;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  settings: Record<NotificationType, boolean>;
}

// ============================================================================
// Valid status transitions
// ============================================================================

const VALID_TRANSITIONS: Record<ConversationStatus, Set<ConversationStatus>> = {
  open: new Set(['pending', 'snoozed', 'resolved']),
  pending: new Set(['open', 'snoozed', 'resolved']),
  snoozed: new Set(['open']),
  resolved: new Set(['open']),
};

export function validateTransition(
  from: ConversationStatus,
  to: ConversationStatus,
): boolean {
  if (from === to) return false;
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

// ============================================================================
// Platform — wires all modules together
// ============================================================================

export class Platform {
  // Stores
  users = new Map<string, User>();
  conversations = new Map<string, Conversation>();
  messages = new Map<string, Message[]>();
  participants = new Map<string, ConversationParticipant[]>();
  events = new Map<string, ConversationEvent[]>();
  labels = new Map<string, Label>();
  conversationLabels: ConversationLabel[] = [];
  cannedResponses = new Map<string, CannedResponse>();
  channels = new Map<string, Channel>();
  channelConversations: ChannelConversation[] = [];
  teams = new Map<string, Team>();
  teamMembers: TeamMember[] = [];
  routingRules = new Map<string, RoutingRule>();
  suggestions = new Map<string, CopilotSuggestion>();
  handoffs = new Map<string, HandoffRequest>();
  portals = new Map<string, Portal>();
  categories = new Map<string, Category>();
  articles = new Map<string, Article>();
  notifications: Notification[] = [];
  notificationSettings = new Map<string, NotificationSettings>();

  // Counters
  private displayIdCounter = 0;
  private roundRobinIndex = new Map<string, number>();

  reset(): void {
    this.users.clear();
    this.conversations.clear();
    this.messages.clear();
    this.participants.clear();
    this.events.clear();
    this.labels.clear();
    this.conversationLabels = [];
    this.cannedResponses.clear();
    this.channels.clear();
    this.channelConversations = [];
    this.teams.clear();
    this.teamMembers = [];
    this.routingRules.clear();
    this.suggestions.clear();
    this.handoffs.clear();
    this.portals.clear();
    this.categories.clear();
    this.articles.clear();
    this.notifications = [];
    this.notificationSettings.clear();
    this.displayIdCounter = 0;
    this.roundRobinIndex.clear();
  }

  // --------------------------------------------------------------------------
  // Identity module
  // --------------------------------------------------------------------------

  createUser(data: {
    type: UserType;
    name: string;
    email?: string | null;
    metadata?: Record<string, unknown>;
  }): User {
    // Contact dedup by email
    if (data.type === 'contact' && data.email) {
      for (const u of this.users.values()) {
        if (u.type === 'contact' && u.email === data.email) {
          return u;
        }
      }
    }

    const now = new Date();
    const user: User = {
      id: randomUUID(),
      type: data.type,
      name: data.name,
      email: data.email ?? null,
      avatarUrl: null,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return undefined;
  }

  // --------------------------------------------------------------------------
  // Channels module
  // --------------------------------------------------------------------------

  createChannel(data: { type: ChannelOrigin; name: string; config?: Record<string, unknown> }): Channel {
    const now = new Date();
    const channel: Channel = {
      id: randomUUID(),
      type: data.type,
      name: data.name,
      config: data.config ?? {},
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.channels.set(channel.id, channel);
    return channel;
  }

  // --------------------------------------------------------------------------
  // Conversations module
  // --------------------------------------------------------------------------

  createConversation(data: {
    channelOrigin: ChannelOrigin;
    subject?: string;
    priority?: Priority;
    assigneeId?: string;
    metadata?: Record<string, unknown>;
  }): Conversation {
    this.displayIdCounter += 1;
    const now = new Date();
    const conv: Conversation = {
      id: randomUUID(),
      displayId: this.displayIdCounter,
      status: 'open',
      channelOrigin: data.channelOrigin,
      assigneeId: data.assigneeId ?? null,
      subject: data.subject ?? null,
      priority: data.priority ?? 'medium',
      snoozedUntil: null,
      firstReplyAt: null,
      resolvedAt: null,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conv.id, conv);
    this.messages.set(conv.id, []);

    this.addEvent(conv.id, data.assigneeId ?? 'system', 'created', {
      channelOrigin: data.channelOrigin,
    });

    return conv;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  listConversations(filters?: {
    status?: ConversationStatus;
    assigneeId?: string;
    channelOrigin?: ChannelOrigin;
  }): Conversation[] {
    let results = [...this.conversations.values()];
    if (filters?.status) results = results.filter((c) => c.status === filters.status);
    if (filters?.assigneeId) results = results.filter((c) => c.assigneeId === filters.assigneeId);
    if (filters?.channelOrigin) results = results.filter((c) => c.channelOrigin === filters.channelOrigin);
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // --------------------------------------------------------------------------
  // Status machine
  // --------------------------------------------------------------------------

  transitionConversation(
    id: string,
    actorId: string,
    newStatus: ConversationStatus,
    snoozedUntil?: Date,
  ): { ok: true; conversation: Conversation } | { ok: false; error: string } {
    const conv = this.conversations.get(id);
    if (!conv) return { ok: false, error: 'Conversation not found' };

    if (!validateTransition(conv.status, newStatus)) {
      return { ok: false, error: `Invalid transition: ${conv.status} -> ${newStatus}` };
    }

    const from = conv.status;
    conv.status = newStatus;
    conv.resolvedAt = newStatus === 'resolved' ? new Date() : null;
    conv.snoozedUntil = newStatus === 'snoozed' ? (snoozedUntil ?? null) : null;
    conv.updatedAt = new Date();

    const eventType =
      newStatus === 'resolved' ? 'resolved' :
      newStatus === 'snoozed' ? 'snoozed' :
      newStatus === 'open' ? 'reopened' :
      'status_changed';

    this.addEvent(id, actorId, eventType, { from, to: newStatus });

    return { ok: true, conversation: conv };
  }

  resolveConversation(id: string, actorId: string) {
    return this.transitionConversation(id, actorId, 'resolved');
  }

  reopenConversation(id: string, actorId: string) {
    return this.transitionConversation(id, actorId, 'open');
  }

  snoozeConversation(id: string, actorId: string, until: Date) {
    return this.transitionConversation(id, actorId, 'snoozed', until);
  }

  // --------------------------------------------------------------------------
  // Messages
  // --------------------------------------------------------------------------

  createMessage(data: {
    conversationId: string;
    senderId: string;
    type?: MessageType;
    visibility?: MessageVisibility;
    body: string;
    bodyHtml?: string | null;
    metadata?: Record<string, unknown>;
    attachments?: Array<{ url: string; filename: string; contentType: string; size: number }>;
  }): Message {
    if (!data.body || data.body.trim() === '') {
      throw new Error('Message body cannot be empty');
    }

    const conv = this.conversations.get(data.conversationId);
    if (!conv) throw new Error('Conversation not found');

    const now = new Date();
    const msg: Message = {
      id: randomUUID(),
      conversationId: data.conversationId,
      senderId: data.senderId,
      type: data.type ?? 'text',
      visibility: data.visibility ?? 'public',
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      metadata: data.metadata ?? {},
      attachments: data.attachments ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const msgs = this.messages.get(data.conversationId) ?? [];
    msgs.push(msg);
    this.messages.set(data.conversationId, msgs);

    // Auto-reopen resolved conversation on new contact message
    const sender = this.users.get(data.senderId);
    if (sender?.type === 'contact' && conv.status === 'resolved') {
      this.reopenConversation(conv.id, data.senderId);
    }

    return msg;
  }

  listMessages(conversationId: string, visibility?: MessageVisibility): Message[] {
    const msgs = this.messages.get(conversationId) ?? [];
    if (visibility) return msgs.filter((m) => m.visibility === visibility);
    return [...msgs];
  }

  // --------------------------------------------------------------------------
  // Assignment
  // --------------------------------------------------------------------------

  assignConversation(conversationId: string, assigneeId: string, actorId: string): void {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');

    const user = this.users.get(assigneeId);
    if (!user) throw new Error(`User ${assigneeId} not found`);

    conv.assigneeId = assigneeId;
    conv.updatedAt = new Date();

    // Add as participant if not already
    const parts = this.participants.get(conversationId) ?? [];
    if (!parts.find((p) => p.userId === assigneeId && !p.leftAt)) {
      parts.push({
        id: randomUUID(),
        conversationId,
        userId: assigneeId,
        role: 'assignee',
        joinedAt: new Date(),
        leftAt: null,
      });
      this.participants.set(conversationId, parts);
    }

    this.addEvent(conversationId, actorId, 'assigned', { assigneeId });
  }

  // --------------------------------------------------------------------------
  // Participants
  // --------------------------------------------------------------------------

  addParticipant(conversationId: string, userId: string, role: ParticipantRole): ConversationParticipant {
    const parts = this.participants.get(conversationId) ?? [];
    const existing = parts.find((p) => p.userId === userId && !p.leftAt);
    if (existing) return existing;

    const participant: ConversationParticipant = {
      id: randomUUID(),
      conversationId,
      userId,
      role,
      joinedAt: new Date(),
      leftAt: null,
    };
    parts.push(participant);
    this.participants.set(conversationId, parts);

    this.addEvent(conversationId, userId, 'participant_joined', { userId, role });
    return participant;
  }

  getParticipants(conversationId: string): ConversationParticipant[] {
    return (this.participants.get(conversationId) ?? []).filter((p) => !p.leftAt);
  }

  // --------------------------------------------------------------------------
  // Events (audit log)
  // --------------------------------------------------------------------------

  addEvent(
    conversationId: string,
    actorId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): ConversationEvent {
    const event: ConversationEvent = {
      id: randomUUID(),
      conversationId,
      actorId,
      eventType,
      payload,
      createdAt: new Date(),
    };
    const events = this.events.get(conversationId) ?? [];
    events.push(event);
    this.events.set(conversationId, events);
    return event;
  }

  getEvents(conversationId: string): ConversationEvent[] {
    return this.events.get(conversationId) ?? [];
  }

  // --------------------------------------------------------------------------
  // Labels
  // --------------------------------------------------------------------------

  createLabel(data: { name: string; color?: string | null }): Label {
    const label: Label = {
      id: randomUUID(),
      name: data.name,
      color: data.color ?? null,
      createdAt: new Date(),
    };
    this.labels.set(label.id, label);
    return label;
  }

  addLabelToConversation(conversationId: string, labelId: string): void {
    const exists = this.conversationLabels.find(
      (cl) => cl.conversationId === conversationId && cl.labelId === labelId,
    );
    if (exists) return; // idempotent
    this.conversationLabels.push({ conversationId, labelId });
  }

  getConversationLabels(conversationId: string): Label[] {
    const labelIds = this.conversationLabels
      .filter((cl) => cl.conversationId === conversationId)
      .map((cl) => cl.labelId);
    return labelIds.map((id) => this.labels.get(id)!).filter(Boolean);
  }

  // --------------------------------------------------------------------------
  // Canned responses
  // --------------------------------------------------------------------------

  createCannedResponse(data: {
    title: string;
    body: string;
    bodyHtml?: string | null;
    createdBy: string;
  }): CannedResponse {
    const now = new Date();
    const cr: CannedResponse = {
      id: randomUUID(),
      title: data.title,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.cannedResponses.set(cr.id, cr);
    return cr;
  }

  searchCannedResponses(query: string): CannedResponse[] {
    // In-memory search uses literal string matching.
    // In production, SQL ILIKE would need escaping of %, _, and \.
    // Here we just use includes() which handles special chars naturally.
    const lower = query.toLowerCase();
    return [...this.cannedResponses.values()].filter(
      (cr) => cr.title.toLowerCase().includes(lower),
    );
  }

  // --------------------------------------------------------------------------
  // Channel conversations mapping
  // --------------------------------------------------------------------------

  createChannelConversation(data: {
    channelId: string;
    conversationId: string;
    externalId: string;
    externalMetadata?: Record<string, unknown>;
  }): ChannelConversation {
    const cc: ChannelConversation = {
      id: randomUUID(),
      channelId: data.channelId,
      conversationId: data.conversationId,
      externalId: data.externalId,
      externalMetadata: data.externalMetadata ?? {},
    };
    this.channelConversations.push(cc);
    return cc;
  }

  // --------------------------------------------------------------------------
  // Teams
  // --------------------------------------------------------------------------

  createTeam(name: string): Team {
    const now = new Date();
    const team: Team = {
      id: randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    };
    this.teams.set(team.id, team);
    return team;
  }

  addTeamMember(teamId: string, userId: string, role: TeamMemberRole = 'member'): TeamMember {
    const member: TeamMember = {
      teamId,
      userId,
      role,
      createdAt: new Date(),
    };
    this.teamMembers.push(member);
    return member;
  }

  getTeamMembers(teamId: string): TeamMember[] {
    return this.teamMembers.filter((m) => m.teamId === teamId);
  }

  // --------------------------------------------------------------------------
  // Routing rules
  // --------------------------------------------------------------------------

  createRoutingRule(data: {
    name: string;
    priority: number;
    conditions: { channel?: ChannelOrigin; labels?: string[]; keywords?: string[] };
    action: AssignmentAction;
    targetType: TargetType;
    targetId: string;
    active?: boolean;
  }): RoutingRule {
    const now = new Date();
    const rule: RoutingRule = {
      id: randomUUID(),
      name: data.name,
      priority: data.priority,
      conditions: data.conditions,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.routingRules.set(rule.id, rule);
    return rule;
  }

  /** Evaluate routing rules against a conversation context. Returns first match. */
  evaluateRouting(conversation: {
    id: string;
    channelOrigin: ChannelOrigin;
    subject?: string | null;
    labels?: string[];
    body?: string | null;
  }): RoutingRule | null {
    const activeRules = [...this.routingRules.values()]
      .filter((r) => r.active)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      if (this.matchConditions(conversation, rule.conditions)) {
        return rule;
      }
    }
    return null;
  }

  private matchConditions(
    conversation: {
      channelOrigin: ChannelOrigin;
      subject?: string | null;
      labels?: string[];
      body?: string | null;
    },
    conditions: { channel?: ChannelOrigin; labels?: string[]; keywords?: string[] },
  ): boolean {
    const hasConditions =
      conditions.channel !== undefined ||
      (conditions.labels && conditions.labels.length > 0) ||
      (conditions.keywords && conditions.keywords.length > 0);

    if (!hasConditions) return true;

    if (conditions.channel !== undefined) {
      if (conversation.channelOrigin !== conditions.channel) return false;
    }

    if (conditions.labels && conditions.labels.length > 0) {
      const convLabels = conversation.labels ?? [];
      if (!conditions.labels.some((l) => convLabels.includes(l))) return false;
    }

    if (conditions.keywords && conditions.keywords.length > 0) {
      const searchText = [conversation.subject ?? '', conversation.body ?? '']
        .join(' ')
        .toLowerCase();
      if (!conditions.keywords.some((kw) => searchText.includes(kw.toLowerCase()))) return false;
    }

    return true;
  }

  /** Execute a routing rule action (assign agent/team/bot). */
  executeRoutingAction(
    conversationId: string,
    rule: RoutingRule,
    actorId: string,
  ): { assignedTo: string } {
    switch (rule.action) {
      case 'assign_agent':
      case 'assign_bot': {
        this.assignConversation(conversationId, rule.targetId, actorId);
        return { assignedTo: rule.targetId };
      }
      case 'assign_team': {
        const agentId = this.roundRobin(rule.targetId);
        if (!agentId) {
          throw new Error(`No members in team ${rule.targetId}`);
        }
        this.assignConversation(conversationId, agentId, actorId);
        return { assignedTo: agentId };
      }
    }
  }

  private roundRobin(teamId: string): string | null {
    const members = this.getTeamMembers(teamId);
    if (members.length === 0) return null;

    const currentIndex = this.roundRobinIndex.get(teamId) ?? -1;
    const nextIndex = (currentIndex + 1) % members.length;
    this.roundRobinIndex.set(teamId, nextIndex);

    return members[nextIndex]!.userId;
  }

  // --------------------------------------------------------------------------
  // Agent copilot
  // --------------------------------------------------------------------------

  createSuggestion(data: {
    conversationId: string;
    agentId: string;
    suggestedReply: string;
    confidence: number;
    reasoning: string;
  }): CopilotSuggestion {
    const suggestion: CopilotSuggestion = {
      id: randomUUID(),
      ...data,
      status: 'pending',
      createdAt: new Date(),
    };
    this.suggestions.set(suggestion.id, suggestion);
    return suggestion;
  }

  acceptSuggestion(id: string, edits?: string): CopilotSuggestion | undefined {
    const s = this.suggestions.get(id);
    if (!s || s.status !== 'pending') return undefined;
    s.status = 'accepted';
    if (edits !== undefined) s.suggestedReply = edits;
    return s;
  }

  dismissSuggestion(id: string): CopilotSuggestion | undefined {
    const s = this.suggestions.get(id);
    if (!s || s.status !== 'pending') return undefined;
    s.status = 'dismissed';
    return s;
  }

  listPendingSuggestions(conversationId: string): CopilotSuggestion[] {
    return [...this.suggestions.values()].filter(
      (s) => s.conversationId === conversationId && s.status === 'pending',
    );
  }

  // --------------------------------------------------------------------------
  // Agent handoff
  // --------------------------------------------------------------------------

  requestHandoff(
    fromAgentId: string,
    conversationId: string,
    reason: string,
    toUserId?: string,
  ): HandoffRequest {
    const handoff: HandoffRequest = {
      id: randomUUID(),
      fromAgentId,
      toUserId: toUserId ?? null,
      conversationId,
      reason,
      contextSummary: `Agent ${fromAgentId} escalated: ${reason}`,
      createdAt: new Date(),
    };
    this.handoffs.set(handoff.id, handoff);

    // Reassign
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.assigneeId = toUserId ?? null;
      conv.updatedAt = new Date();
    }

    this.addEvent(conversationId, fromAgentId, 'escalated', {
      handoffId: handoff.id,
      reason,
      toUserId: toUserId ?? null,
    });

    return handoff;
  }

  // --------------------------------------------------------------------------
  // Knowledge base
  // --------------------------------------------------------------------------

  createPortal(data: {
    name: string;
    slug: string;
    customDomain?: string | null;
    config?: Record<string, unknown>;
  }): Portal {
    for (const p of this.portals.values()) {
      if (p.slug === data.slug) throw new Error(`Portal slug "${data.slug}" already exists`);
    }
    const now = new Date();
    const portal: Portal = {
      id: randomUUID(),
      name: data.name,
      slug: data.slug,
      customDomain: data.customDomain ?? null,
      config: data.config ?? {},
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.portals.set(portal.id, portal);
    return portal;
  }

  createCategory(data: {
    portalId: string;
    name: string;
    slug: string;
    description?: string | null;
    position?: number;
    parentCategoryId?: string | null;
  }): Category {
    const siblings = [...this.categories.values()].filter(
      (c) => c.portalId === data.portalId,
    );
    const position = data.position ?? (
      siblings.length > 0 ? Math.max(...siblings.map((c) => c.position)) + 1 : 0
    );

    const now = new Date();
    const category: Category = {
      id: randomUUID(),
      portalId: data.portalId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      position,
      parentCategoryId: data.parentCategoryId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.set(category.id, category);
    return category;
  }

  listSubCategories(parentCategoryId: string): Category[] {
    return [...this.categories.values()]
      .filter((c) => c.parentCategoryId === parentCategoryId)
      .sort((a, b) => a.position - b.position);
  }

  createArticle(data: {
    portalId: string;
    categoryId?: string | null;
    title: string;
    slug?: string;
    content: string;
    contentHtml?: string | null;
    authorId: string;
    position?: number;
  }): Article {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const siblings = [...this.articles.values()].filter(
      (a) => a.portalId === data.portalId,
    );
    const position = data.position ?? (
      siblings.length > 0 ? Math.max(...siblings.map((a) => a.position)) + 1 : 0
    );

    const now = new Date();
    const article: Article = {
      id: randomUUID(),
      portalId: data.portalId,
      categoryId: data.categoryId ?? null,
      title: data.title,
      slug,
      content: data.content,
      contentHtml: data.contentHtml ?? null,
      status: 'draft',
      authorId: data.authorId,
      position,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.articles.set(article.id, article);
    return article;
  }

  publishArticle(id: string): Article | undefined {
    const a = this.articles.get(id);
    if (!a) return undefined;
    a.status = 'published';
    a.updatedAt = new Date();
    return a;
  }

  archiveArticle(id: string): Article | undefined {
    const a = this.articles.get(id);
    if (!a) return undefined;
    a.status = 'archived';
    a.updatedAt = new Date();
    return a;
  }

  incrementViewCount(id: string): void {
    const a = this.articles.get(id);
    if (a) a.viewCount += 1;
  }

  listPublishedArticles(portalId: string): Article[] {
    return [...this.articles.values()]
      .filter((a) => a.portalId === portalId && a.status === 'published')
      .sort((a, b) => a.position - b.position);
  }

  searchArticles(query: string, options?: { portalId?: string; status?: ArticleStatus }): Article[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    let results = [...this.articles.values()];
    if (options?.portalId) results = results.filter((a) => a.portalId === options.portalId);
    if (options?.status) results = results.filter((a) => a.status === options.status);

    return results.filter((article) => {
      const haystack = `${article.title} ${article.content}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------

  createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    conversationId?: string;
  }): Notification {
    // Check if user has notifications enabled for this type
    const settings = this.notificationSettings.get(data.userId);
    if (settings) {
      const typeEnabled = settings.settings[data.type];
      if (typeEnabled === false) {
        // Still create but for test purposes we skip if disabled
        // Actually, let's respect the setting and not create
        throw new Error('NOTIFICATION_DISABLED');
      }
    }

    const now = new Date();
    const notification: Notification = {
      id: randomUUID(),
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      conversationId: data.conversationId ?? null,
      read: false,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.push(notification);
    return notification;
  }

  /** Create notification only if user has the type enabled */
  tryCreateNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    conversationId?: string;
  }): Notification | null {
    const settings = this.notificationSettings.get(data.userId);
    if (settings && settings.settings[data.type] === false) {
      return null;
    }
    const now = new Date();
    const notification: Notification = {
      id: randomUUID(),
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      conversationId: data.conversationId ?? null,
      read: false,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.push(notification);
    return notification;
  }

  listNotifications(userId: string, filters?: { read?: boolean; type?: NotificationType }): Notification[] {
    let result = this.notifications.filter((n) => n.userId === userId);
    if (filters?.read !== undefined) result = result.filter((n) => n.read === filters.read);
    if (filters?.type) result = result.filter((n) => n.type === filters.type);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  markNotificationAsRead(id: string): boolean {
    const n = this.notifications.find((n) => n.id === id);
    if (!n) return false;
    n.read = true;
    n.updatedAt = new Date();
    return true;
  }

  setNotificationSettings(userId: string, settings: Partial<NotificationSettings>): NotificationSettings {
    const existing = this.notificationSettings.get(userId) ?? {
      userId,
      emailEnabled: true,
      pushEnabled: true,
      settings: {
        new_message: true,
        assignment: true,
        mention: true,
        status_change: true,
        escalation: true,
      },
    };

    const updated: NotificationSettings = {
      ...existing,
      ...settings,
      settings: { ...existing.settings, ...(settings.settings ?? {}) },
    };
    this.notificationSettings.set(userId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Analytics helpers
  // --------------------------------------------------------------------------

  getConversationMetrics(): {
    total: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    avgFirstReplyMs: number | null;
    avgResolutionMs: number | null;
  } {
    const convs = [...this.conversations.values()];
    const byStatus: Record<string, number> = {};
    const byChannel: Record<string, number> = {};

    let totalFirstReply = 0;
    let countFirstReply = 0;
    let totalResolution = 0;
    let countResolution = 0;

    for (const c of convs) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      byChannel[c.channelOrigin] = (byChannel[c.channelOrigin] ?? 0) + 1;

      if (c.firstReplyAt) {
        totalFirstReply += c.firstReplyAt.getTime() - c.createdAt.getTime();
        countFirstReply++;
      }
      if (c.resolvedAt) {
        totalResolution += c.resolvedAt.getTime() - c.createdAt.getTime();
        countResolution++;
      }
    }

    return {
      total: convs.length,
      byStatus,
      byChannel,
      avgFirstReplyMs: countFirstReply > 0 ? totalFirstReply / countFirstReply : null,
      avgResolutionMs: countResolution > 0 ? totalResolution / countResolution : null,
    };
  }

  /** Set first_reply_at on a conversation (called when agent first replies) */
  setFirstReplyAt(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv && !conv.firstReplyAt) {
      conv.firstReplyAt = new Date();
      conv.updatedAt = new Date();
    }
  }

  /** Check SLA breaches: conversations past threshold without first reply or resolution */
  checkSlaBreaches(thresholds: {
    firstReplyMs: number;
    resolutionMs: number;
  }): Array<{
    conversationId: string;
    type: 'first_reply' | 'resolution';
    actualMs: number;
    thresholdMs: number;
  }> {
    const now = new Date();
    const breaches: Array<{
      conversationId: string;
      type: 'first_reply' | 'resolution';
      actualMs: number;
      thresholdMs: number;
    }> = [];

    for (const conv of this.conversations.values()) {
      if (['open', 'pending'].includes(conv.status)) {
        const elapsed = now.getTime() - conv.createdAt.getTime();

        if (!conv.firstReplyAt && elapsed > thresholds.firstReplyMs) {
          breaches.push({
            conversationId: conv.id,
            type: 'first_reply',
            actualMs: elapsed,
            thresholdMs: thresholds.firstReplyMs,
          });
        }

        if (!conv.resolvedAt && elapsed > thresholds.resolutionMs) {
          breaches.push({
            conversationId: conv.id,
            type: 'resolution',
            actualMs: elapsed,
            thresholdMs: thresholds.resolutionMs,
          });
        }
      }
    }

    return breaches;
  }
}

/**
 * Create a fresh Platform instance for testing.
 * Call reset() in beforeEach for clean state.
 */
export function createPlatform(): Platform {
  return new Platform();
}
