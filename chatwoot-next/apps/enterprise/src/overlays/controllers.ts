/**
 * Controller overlays — 17 overrides.
 *
 * Rails source: `enterprise/app/controllers/enterprise/`
 *
 * SPECIAL CASE — non-standard naming:
 *   `app/controllers/api/v1/accounts_controller.rb:151` calls
 *   `prepend_mod_with 'Api::V1::AccountsSettings'` (NOT `AccountsController`).
 *   The enterprise overlay is therefore registered under the rename target
 *   `Api::V1::AccountsSettings` instead of mirroring the controller name.
 */

import type { OverlayRegistry } from '../boot';

export function registerControllerOverlays(controllerRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS controller layer lands.

  // Standard 1:1 controller overlays
  controllerRegistry.register('Api::V1::ConversationsController', stub('ConversationsController'));
  controllerRegistry.register('Api::V1::Accounts::ContactsController', stub('ContactsController'));
  controllerRegistry.register('Api::V1::Accounts::InboxesController', stub('InboxesController'));
  controllerRegistry.register('Api::V1::Accounts::ReportsController', stub('ReportsController'));
  controllerRegistry.register('Api::V1::Accounts::AgentsController', stub('AgentsController'));
  controllerRegistry.register('Api::V1::Accounts::TeamsController', stub('TeamsController'));
  controllerRegistry.register('Api::V1::Accounts::CustomAttributeDefinitionsController', stub('CustomAttributeDefinitionsController'));
  controllerRegistry.register('Api::V1::Accounts::AutomationRulesController', stub('AutomationRulesController'));
  controllerRegistry.register('Api::V1::Accounts::IntegrationsController', stub('IntegrationsController'));
  controllerRegistry.register('Api::V1::Accounts::WebhooksController', stub('WebhooksController'));
  controllerRegistry.register('Api::V1::Accounts::PortalsController', stub('PortalsController'));
  controllerRegistry.register('Api::V1::Accounts::ArticlesController', stub('ArticlesController'));
  controllerRegistry.register('SuperAdmin::AccountsController', stub('SuperAdminAccountsController'));
  controllerRegistry.register('DashboardController', stub('DashboardController'));
  controllerRegistry.register('Devise::SessionsController', stub('SessionsController'));
  controllerRegistry.register('Api::V2::Accounts::ReportsController', stub('V2ReportsController'));

  // SPECIAL CASE: `app/controllers/api/v1/accounts_controller.rb:151` registers
  // its overlay under the bespoke key `Api::V1::AccountsSettings`. Keep the
  // original Rails contract — do NOT rename to `AccountsController`.
  controllerRegistry.register('Api::V1::AccountsSettings', stub('AccountsSettings'));
}

function stub(label: string) {
  return { __overlay: `enterprise/controllers/${label}` };
}
