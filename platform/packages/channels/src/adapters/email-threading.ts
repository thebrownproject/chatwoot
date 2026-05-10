import type { EmailHeaders, ChannelConversationRecord } from '../types/email.js';

/**
 * Database interface for email threading operations.
 * Mockable in tests; real implementation backed by @buildpass/db.
 */
export interface ThreadingDb {
  findChannelConversationByExternalId(externalId: string): Promise<ChannelConversationRecord | null>;
  findChannelConversationsByMetadata(
    key: string,
    value: string,
  ): Promise<ChannelConversationRecord[]>;
  findChannelConversationBySubjectAndSender(
    subject: string,
    senderEmail: string,
  ): Promise<ChannelConversationRecord | null>;
  getChannelConversationsByConversation(
    conversationId: string,
  ): Promise<ChannelConversationRecord[]>;
}

/**
 * Try to match an inbound email to an existing conversation.
 *
 * Strategy (ordered by reliability):
 * 1. Check In-Reply-To header against ChannelConversation.external_id
 * 2. Check References headers against known Message-IDs stored in external_metadata
 * 3. Fall back to matching by normalised subject + sender email
 * 4. If no match, return null (caller creates new conversation)
 */
export async function matchToConversation(
  db: ThreadingDb,
  headers: EmailHeaders,
): Promise<ChannelConversationRecord | null> {
  // 1. Match by In-Reply-To → external_id (most reliable)
  if (headers.inReplyTo) {
    const match = await db.findChannelConversationByExternalId(headers.inReplyTo);
    if (match) return match;
  }

  // 2. Match by References headers → stored message IDs in metadata
  if (headers.references?.length) {
    for (const ref of headers.references) {
      const matches = await db.findChannelConversationsByMetadata('messageIds', ref);
      if (matches.length > 0) return matches[0];
    }
  }

  // 3. Fall back to subject + sender (least reliable — strips Re:/Fwd: prefixes)
  const normalisedSubject = normaliseSubject(headers.subject);
  if (normalisedSubject) {
    const match = await db.findChannelConversationBySubjectAndSender(
      normalisedSubject,
      headers.from,
    );
    if (match) return match;
  }

  // 4. No match — caller should create a new conversation
  return null;
}

/**
 * Generate a unique Message-ID for an outbound email.
 * Format: <conversationId.timestamp.random@domain>
 */
export function generateMessageId(conversationId: string, domain: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  return `${conversationId}.${timestamp}.${random}@${domain}`;
}

/**
 * Build In-Reply-To and References headers from conversation history.
 * Uses the most recent outbound Message-ID as In-Reply-To and collects
 * all known Message-IDs for the References header.
 */
export async function buildThreadHeaders(
  db: ThreadingDb,
  conversationId: string,
): Promise<{ inReplyTo?: string; references: string[] }> {
  const channelConversations = await db.getChannelConversationsByConversation(conversationId);

  const allMessageIds: string[] = [];

  for (const cc of channelConversations) {
    if (cc.externalId) {
      allMessageIds.push(cc.externalId);
    }
    const metadata = cc.externalMetadata as { messageIds?: string[] };
    if (metadata.messageIds) {
      allMessageIds.push(...metadata.messageIds);
    }
  }

  // Deduplicate while preserving order
  const unique = [...new Set(allMessageIds)];

  return {
    inReplyTo: unique.length > 0 ? unique[unique.length - 1] : undefined,
    references: unique,
  };
}

/** Strip all Re:/Fwd:/Fw: prefixes (including stacked) and normalise whitespace */
export function normaliseSubject(subject: string): string {
  let s = subject;
  while (/^(?:re|fwd?)\s*:\s*/i.test(s)) {
    s = s.replace(/^(?:re|fwd?)\s*:\s*/i, '');
  }
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}
