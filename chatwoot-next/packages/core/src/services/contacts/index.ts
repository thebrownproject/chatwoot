import type { AccountContext } from '../../lib/account-context.js';

/**
 * Ports `app/services/contacts/` and related builders — port one-by-one in
 * Phase 3. Source paths to mirror:
 *   - app/services/contacts/bulk_action_service.rb
 *   - app/services/contacts/bulk_assign_labels_service.rb
 *   - app/services/contacts/bulk_delete_service.rb
 *   - app/services/contacts/contactable_inboxes_service.rb
 *   - app/services/contacts/filter_service.rb
 *   - app/services/contacts/sync_attributes.rb
 *   - app/builders/contact_inbox_builder.rb
 *   - app/builders/contact_builder.rb
 *   - app/services/contact_identify_action.rb
 *   - app/services/contact_merge_action.rb
 */

export async function findOrCreateContact(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function mergeContacts(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function updateContact(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}
