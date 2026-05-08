/**
 * Stub public-API entity shapes consumed by the widget.
 *
 * Field shapes match `app/javascript/widget/` consumption sites
 * (e.g. `app/javascript/widget/store/modules/contacts.js`,
 * `.../conversation.js`, `.../message.js`).
 *
 * TODO: expand from real api-public responses; for now only the minimal
 * fields the widget reads are stubbed.
 */

export interface PublicApiContact {
  id: number;
  name?: string;
  email?: string;
  phone_number?: string;
}

export interface PublicApiConversation {
  id: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  inbox_id: number;
}

export interface PublicApiMessageSender {
  id: number;
  name?: string;
  type?: 'contact' | 'user' | 'agent_bot';
}

export interface PublicApiMessage {
  id: number;
  content: string | null;
  conversation_id: number;
  sender?: PublicApiMessageSender;
}
