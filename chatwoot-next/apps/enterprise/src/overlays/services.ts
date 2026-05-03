/**
 * Service overlays — 7 overrides.
 *
 * Rails source: `enterprise/app/services/enterprise/`
 *
 * These are non-Captain services. Captain services live under
 * `lib/captain/` and are registered separately via `overlays/captain.ts`.
 */

import type { OverlayRegistry } from '../boot';

export function registerServiceOverlays(serviceRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS service layer lands.
  serviceRegistry.register('AutoAssignment::AgentAssignmentService', stub('AgentAssignmentService'));
  serviceRegistry.register('AutoAssignment::InboxRoundRobinService', stub('InboxRoundRobinService'));
  serviceRegistry.register('Conversations::ActivityMessageService', stub('ActivityMessageService'));
  serviceRegistry.register('Conversations::EventDataPresenter', stub('EventDataPresenter'));
  serviceRegistry.register('MessageTemplates::HookExecutionService', stub('HookExecutionService'));
  serviceRegistry.register('Notification::PushNotificationService', stub('PushNotificationService'));
  serviceRegistry.register('Reports::AgentSummary', stub('AgentSummary'));
}

function stub(label: string) {
  return { __overlay: `enterprise/services/${label}` };
}
