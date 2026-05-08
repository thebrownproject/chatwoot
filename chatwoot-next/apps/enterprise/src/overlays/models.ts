/**
 * Model overlays — 36 overrides.
 *
 * Rails source: `enterprise/app/models/enterprise/`,
 *               `enterprise/app/models/concerns/`
 *
 * SPECIAL CASE — Account stacks 4 overlays
 *   `app/models/account.rb:208-211`:
 *     prepend_mod_with 'Account'
 *     prepend_mod_with 'PlanUsageAndLimits'
 *     include_mod_with 'Concerns::Account'
 *     include_mod_with 'Audit::Account'
 *   The model registry MUST support stacking (multiple overlays per target).
 *   We call `register('Account', overlayName, fn)` four times for that one class.
 */

import type { StackingOverlayRegistry } from '../boot';

export function registerModelOverlays(modelRegistry: StackingOverlayRegistry): void {
  // TODO: port real override bodies once the OSS model layer lands.

  // SPECIAL CASE — stacked overlays for Account (4 overlays for one model).
  registerStacked(modelRegistry, 'Account', 'Account', stub('Account'));
  registerStacked(modelRegistry, 'Account', 'PlanUsageAndLimits', stub('PlanUsageAndLimits'));
  registerStacked(modelRegistry, 'Account', 'Concerns::Account', stub('Concerns::Account'));
  registerStacked(modelRegistry, 'Account', 'Audit::Account', stub('Audit::Account'));

  // Standard single-overlay model targets (35 remaining).
  const singles: string[] = [
    'AccountUser',
    'Agent',
    'AgentBot',
    'Article',
    'Attachment',
    'AuditLog',
    'AutomationRule',
    'Campaign',
    'CannedResponse',
    'Channel::Api',
    'Channel::Email',
    'Channel::FacebookPage',
    'Channel::TwilioSms',
    'Channel::WebWidget',
    'Channel::Whatsapp',
    'Contact',
    'ContactInbox',
    'Conversation',
    'CustomAttributeDefinition',
    'CustomFilter',
    'Inbox',
    'Integrations::Hook',
    'Label',
    'Macro',
    'Message',
    'Notification',
    'NotificationSetting',
    'Portal',
    'Report',
    'Team',
    'TeamMember',
    'User',
    'Webhook',
    'WorkingHour',
    'DataImport',
  ];

  for (const name of singles) {
    modelRegistry.register(name, stub(name));
  }
}

function registerStacked(registry: StackingOverlayRegistry, target: string, overlayName: string, overlay: unknown): void {
  if (typeof registry.registerStacked === 'function') {
    registry.registerStacked(target, overlayName, overlay);
  } else {
    // Fallback: encode the stacked overlay name into the registration key so a
    // simple OverlayRegistry implementation can still discriminate them.
    registry.register(`${target}::${overlayName}`, overlay);
  }
}

function stub(label: string) {
  return { __overlay: `enterprise/models/${label}` };
}
