import type { AccountContext } from '../../lib/account-context.js';

/**
 * Ports `app/services/conversations/` (~20 services across OSS + Enterprise)
 * — port one-by-one in Phase 3. Source paths to mirror:
 *   - app/services/conversations/assignment_service.rb
 *   - app/services/conversations/filter_service.rb
 *   - app/services/conversations/message_window_service.rb
 *   - app/services/conversations/permission_filter_service.rb
 *   - app/services/conversations/typing_status_manager.rb
 *   - enterprise/app/services/conversations/* (sla, copilot, etc.)
 *
 * Plus the controller-level orchestration around create / status changes
 * currently spread across `app/builders/` and AR callbacks on Conversation.
 */

export async function createConversation(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function assignConversation(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function updateStatus(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function addMessage(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}
