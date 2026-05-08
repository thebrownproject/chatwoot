export interface DateRangeFilter {
  from?: Date | undefined;
  to?: Date | undefined;
}

export interface MetricFilters extends DateRangeFilter {
  channel?: string | undefined;
  status?: string | undefined;
}

export interface ConversationMetrics {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  avgFirstReplyMs: number | null;
  avgResolutionMs: number | null;
  resolvedToday: number;
  resolvedThisWeek: number;
  resolvedThisMonth: number;
}

export interface AgentMetrics {
  agentId: string;
  conversationsAssigned: number;
  conversationsResolved: number;
  avgResponseMs: number | null;
  currentOpen: number;
}

export interface TeamMetrics {
  teamId: string;
  conversationsAssigned: number;
  conversationsResolved: number;
  avgFirstReplyMs: number | null;
  avgResolutionMs: number | null;
  currentOpen: number;
}

export interface ChannelMetrics {
  channel: string;
  total: number;
  open: number;
  resolved: number;
  avgFirstReplyMs: number | null;
}

export interface OverviewMetrics {
  totalConversations: number;
  avgFirstReplyMs: number | null;
  avgResolutionMs: number | null;
  slaComplianceRate: number;
}

export interface SlaBreach {
  conversationId: string;
  type: 'first_reply' | 'resolution';
  breachedAt: Date;
  thresholdMs: number;
  actualMs: number;
}

export interface SlaStats {
  totalChecked: number;
  firstReplyBreaches: number;
  resolutionBreaches: number;
  complianceRate: number;
}

export interface AnalyticsManifest {
  name: string;
  routes: string[];
  permissions: string[];
}

/** SLA thresholds — configurable defaults */
export const SLA_DEFAULTS = {
  /** First reply SLA: 5 minutes */
  FIRST_REPLY_MS: 5 * 60 * 1000,
  /** Resolution SLA: 24 hours */
  RESOLUTION_MS: 24 * 60 * 60 * 1000,
} as const;
