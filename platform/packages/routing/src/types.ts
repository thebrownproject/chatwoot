import { z } from 'zod';

// --- Enums ---

export type AssignmentAction = 'assign_agent' | 'assign_team' | 'assign_bot';
export type TargetType = 'user' | 'team';
export type TeamMemberRole = 'lead' | 'member';
export type ChannelOrigin = 'email' | 'web_chat' | 'sms' | 'slack' | 'in_app';
export type ConversationStatus = 'open' | 'pending' | 'snoozed' | 'resolved';

// --- Routing Rules ---

export interface RuleConditions {
  channel?: ChannelOrigin;
  labels?: string[];
  keywords?: string[];
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RuleConditions;
  action: AssignmentAction;
  targetType: TargetType;
  targetId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingRuleCreate {
  name: string;
  priority: number;
  conditions: RuleConditions;
  action: AssignmentAction;
  targetType: TargetType;
  targetId: string;
  active?: boolean;
}

export interface RoutingRuleUpdate {
  name?: string;
  priority?: number;
  conditions?: RuleConditions;
  action?: AssignmentAction;
  targetType?: TargetType;
  targetId?: string;
  active?: boolean;
}

// --- Teams ---

export interface Team {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamCreate {
  name: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  createdAt: Date;
}

export interface TeamMemberAdd {
  userId: string;
  role?: TeamMemberRole;
}

// --- Conversation (subset needed for routing evaluation) ---

export interface RoutableConversation {
  id: string;
  channelOrigin: ChannelOrigin;
  subject?: string | null;
  labels?: string[];
  body?: string | null;
}

// --- Action result from rule evaluation ---

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  action: AssignmentAction;
  targetType: TargetType;
  targetId: string;
}

// --- Zod schemas for API validation ---

export const ruleConditionsSchema = z.object({
  channel: z
    .enum(['email', 'web_chat', 'sms', 'slack', 'in_app'])
    .optional(),
  labels: z.array(z.string().min(1)).optional(),
  keywords: z.array(z.string().min(1)).optional(),
});

export const routingRuleCreateSchema = z.object({
  name: z.string().min(1).refine((s) => s.trim().length > 0, { message: 'Name cannot be whitespace only' }),
  priority: z.number().int().min(0),
  conditions: ruleConditionsSchema,
  action: z.enum(['assign_agent', 'assign_team', 'assign_bot']),
  targetType: z.enum(['user', 'team']),
  targetId: z.string().uuid(),
  active: z.boolean().optional().default(true),
});

export const routingRuleUpdateSchema = z.object({
  name: z.string().min(1).refine((s) => s.trim().length > 0, { message: 'Name cannot be whitespace only' }).optional(),
  priority: z.number().int().min(0).optional(),
  conditions: ruleConditionsSchema.optional(),
  action: z.enum(['assign_agent', 'assign_team', 'assign_bot']).optional(),
  targetType: z.enum(['user', 'team']).optional(),
  targetId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});

export const teamCreateSchema = z.object({
  name: z.string().min(1).refine((s) => s.trim().length > 0, {
    message: 'Team name cannot be whitespace-only',
  }),
});

export const teamMemberAddSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['lead', 'member']).optional().default('member'),
});

// --- Database adapter interface ---
// Modules take `db` as first param. This is the minimal interface
// the routing module needs from the db package.

export interface RoutingDb {
  // Routing rules
  listRoutingRules(): Promise<RoutingRule[]>;
  getRoutingRule(id: string): Promise<RoutingRule | null>;
  createRoutingRule(data: RoutingRuleCreate): Promise<RoutingRule>;
  updateRoutingRule(
    id: string,
    data: RoutingRuleUpdate,
  ): Promise<RoutingRule | null>;
  deleteRoutingRule(id: string): Promise<boolean>;

  // Teams
  listTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | null>;
  createTeam(data: TeamCreate): Promise<Team>;
  deleteTeam(id: string): Promise<boolean>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  addTeamMember(
    teamId: string,
    userId: string,
    role: TeamMemberRole,
  ): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;

  // Conversations (for snooze scheduler)
  getSnoozedConversationsDue(): Promise<Array<{ id: string }>>;
  updateConversationStatus(id: string, status: ConversationStatus): Promise<void>;
  assignConversation(conversationId: string, assigneeId: string): Promise<void>;
  createConversationEvent?(data: {
    conversationId: string;
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
