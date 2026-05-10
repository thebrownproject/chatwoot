// Data layer
export {
  listRoutingRules,
  getRoutingRule,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  toggleRoutingRule,
} from './data/routing-rules.js';

export {
  listTeams,
  getTeam,
  createTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from './data/teams.js';

// Routing engine
export { evaluate, matchConditions, clearKeywordCache } from './engine/evaluator.js';
export { executeAction, roundRobin, clearRoundRobinForTeam, resetRoundRobin } from './engine/assigner.js';

// Snooze scheduler
export {
  SNOOZE_JOB_NAME,
  SNOOZE_CRON,
  checkSnoozedConversations,
  checkSnoozedConversationsDetailed,
  processSnoozeJob,
} from './jobs/snooze-scheduler.js';

// Routes
export { routingRulesRoutes } from './routes/routing-rules.js';
export { teamsRoutes } from './routes/teams.js';

// Manifest
export { manifest } from './manifest.js';

// Types
export type {
  AssignmentAction,
  TargetType,
  TeamMemberRole,
  ChannelOrigin,
  ConversationStatus,
  RuleConditions,
  RoutingRule,
  RoutingRuleCreate,
  RoutingRuleUpdate,
  Team,
  TeamCreate,
  TeamMember,
  TeamMemberAdd,
  RoutableConversation,
  RuleMatch,
  RoutingDb,
} from './types.js';
export type { SnoozeJobData, SnoozeResult } from './jobs/snooze-scheduler.js';

export {
  ruleConditionsSchema,
  routingRuleCreateSchema,
  routingRuleUpdateSchema,
  teamCreateSchema,
  teamMemberAddSchema,
} from './types.js';
