/**
 * Socket.io room name helpers.
 *
 * Names mirror the Rails ActionCable channel/stream identifiers (see
 * `app/channels/room_channel.rb` and `apps/core/events/publish` in the Next.js
 * core package) so Vue dashboard clients still receive events during the
 * Rails -> Next.js cutover. Both publishers fan out to the same room ids.
 */

export const accountRoom = (accountId: number | string): string =>
  `account_${accountId}`;

export const userRoom = (userId: number | string): string => `user_${userId}`;

export const conversationRoom = (conversationId: number | string): string =>
  `conversation_${conversationId}`;

export const inboxRoom = (inboxId: number | string): string =>
  `inbox_${inboxId}`;
