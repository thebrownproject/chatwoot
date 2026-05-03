import type { AccountContext } from '../../lib/account-context.js';

/**
 * Ports `app/services/messages/` and the message-builder layer — port
 * one-by-one in Phase 3. Source paths to mirror:
 *   - app/builders/messages/message_builder.rb
 *   - app/services/messages/status_update_service.rb
 *   - app/services/messages/mention_service.rb
 *   - app/services/messages/in_reply_to_message_builder.rb
 *   - app/services/messages/send_email_notification_service.rb
 *   - app/services/messages/new_message_notification_service.rb
 *   - app/services/messages/markdown_renderer_service.rb
 *   - app/services/messages/webhook_content_normalizer.rb
 *   - channel-specific outgoing senders under app/services/<channel>/
 */

export async function sendOutgoingMessage(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function recordIncomingMessage(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}

export async function updateMessage(_ctx: AccountContext, _input: unknown): Promise<unknown> {
  throw new Error('not implemented');
}
