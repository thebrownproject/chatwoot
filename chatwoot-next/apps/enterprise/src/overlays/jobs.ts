/**
 * Job overlays — 4 overrides.
 *
 * Rails source: `enterprise/app/jobs/enterprise/`
 *
 * These overlay existing OSS jobs. Enterprise-only jobs (SLA, SAML, message,
 * migration, portal) are added separately by `src/jobs/index.ts`.
 */

import type { OverlayRegistry } from '../boot';

export function registerJobOverlays(jobRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS job layer lands.
  jobRegistry.register('Account::ResetPolicy', stub('AccountResetPolicy'));
  jobRegistry.register('Conversation::ActivityMessageJob', stub('ConversationActivityMessageJob'));
  jobRegistry.register('Webhooks::TriggerJob', stub('WebhooksTriggerJob'));
  jobRegistry.register('Internal::AccountMaintenanceJob', stub('InternalAccountMaintenanceJob'));
}

function stub(label: string) {
  return { __overlay: `enterprise/jobs/${label}` };
}
