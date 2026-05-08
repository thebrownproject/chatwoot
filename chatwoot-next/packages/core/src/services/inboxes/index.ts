import type { AccountContext } from '../../lib/account-context.js';

/**
 * Ports inbox-related services and builders — port one-by-one in Phase 3.
 * Source paths to mirror:
 *   - app/builders/channel_builder.rb
 *   - app/services/inboxes/* (if/when added; today most logic sits on
 *     Inbox / Channel models and the channel-specific subclasses under
 *     app/models/channel/*)
 *   - app/controllers/api/v1/accounts/inboxes_controller.rb (orchestration)
 */

export async function createInbox(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function attachAgentToInbox(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function getInboxByChannel(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}
