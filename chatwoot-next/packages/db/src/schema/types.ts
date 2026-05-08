// JSONB placeholder types — refine as Rails app types are mapped.
// TODO: Replace `Record<string, unknown>` with concrete shapes from Rails models.

export type AccountSettings = Record<string, unknown>;
export type AccountLimits = Record<string, unknown>;
export type AccountCustomAttributes = Record<string, unknown>;
export type AccountInternalAttributes = Record<string, unknown>;

export type MessageContentAttributes = Record<string, unknown>;
export type MessageMeta = Record<string, unknown>;
export type MessageExternalSourceIds = Record<string, unknown>;
export type MessageAdditionalAttributes = Record<string, unknown>;
export type MessageSentiment = Record<string, unknown>;

export type ConversationAdditionalAttributes = Record<string, unknown>;
export type ConversationCustomAttributes = Record<string, unknown>;
export type ConversationBotConfig = Record<string, unknown>;

export type ContactAdditionalAttributes = Record<string, unknown>;
export type ContactCustomAttributes = Record<string, unknown>;

export type AutomationConditions = Record<string, unknown>;
export type AutomationActions = Record<string, unknown>;
export type MacroActions = Record<string, unknown>;

export type CampaignTriggerRules = Record<string, unknown>;
export type CampaignAudienceEntry = Record<string, unknown>;
export type CampaignTemplateParams = Record<string, unknown>;

export type CaptainAssistantConfig = Record<string, unknown>;
export type CaptainResponseGuideline = Record<string, unknown>;
export type CaptainGuardrail = Record<string, unknown>;
export type CaptainDocumentMetadata = Record<string, unknown>;
export type CaptainDocumentConfig = Record<string, unknown>;
export type CaptainCustomToolAuthConfig = Record<string, unknown>;
export type CaptainCustomToolParamSchema = Record<string, unknown>;
export type CaptainScenarioTool = Record<string, unknown>;
export type CopilotMessage = Record<string, unknown>;

export type ChannelAdditionalAttributes = Record<string, unknown>;
export type ChannelProviderConfig = Record<string, unknown>;
export type ChannelContentTemplates = Record<string, unknown>;
export type ChannelMessageTemplates = Record<string, unknown>;
export type WebWidgetPreChatFormOptions = Record<string, unknown>;

export type InboxAutoAssignmentConfig = Record<string, unknown>;
export type InboxCsatConfig = Record<string, unknown>;
export type PortalConfig = Record<string, unknown>;
export type PortalSslSettings = Record<string, unknown>;
export type ArticleMeta = Record<string, unknown>;

export type CustomAttributeValues = unknown[];
export type CustomFilterQuery = Record<string, unknown>;
export type CustomRolePermissions = string[];

export type DashboardAppContent = unknown[];
export type AgentCapacityExclusionRules = Record<string, unknown>;

export type WebhookSubscriptions = string[];
export type WebhookSettings = Record<string, unknown>;
export type IntegrationsHookSettings = Record<string, unknown>;

export type NotificationMeta = Record<string, unknown>;
export type NotificationSubscriptionAttributes = Record<string, unknown>;

export type AccountSamlRoleMappings = Record<string, unknown>;
export type SlaEventMeta = Record<string, unknown>;
export type CallMeta = Record<string, unknown>;
export type AuditedChanges = Record<string, unknown>;
export type InstallationConfigValue = Record<string, unknown>;

export type UiSettings = Record<string, unknown>;
export type UserCustomAttributes = Record<string, unknown>;
export type UserTokens = Record<string, unknown>;
