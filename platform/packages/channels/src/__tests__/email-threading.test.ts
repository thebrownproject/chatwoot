import { describe, it, expect } from 'vitest';
import {
  matchToConversation,
  generateMessageId,
  buildThreadHeaders,
  normaliseSubject,
  type ThreadingDb,
} from '../adapters/email-threading.js';
import type { ChannelConversationRecord, EmailHeaders } from '../types/email.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockDb(overrides: Partial<ThreadingDb> = {}): ThreadingDb {
  return {
    findChannelConversationByExternalId: async () => null,
    findChannelConversationsByMetadata: async () => [],
    findChannelConversationBySubjectAndSender: async () => null,
    getChannelConversationsByConversation: async () => [],
    ...overrides,
  };
}

const sampleRecord: ChannelConversationRecord = {
  id: 'cc-1',
  channelId: 'ch-1',
  conversationId: 'conv-123',
  externalId: 'msg-001@example.com',
  externalMetadata: { messageIds: ['msg-001@example.com'] },
};

// ---------------------------------------------------------------------------
// matchToConversation
// ---------------------------------------------------------------------------

describe('matchToConversation', () => {
  it('matches by In-Reply-To header (strategy 1)', async () => {
    const db = createMockDb({
      findChannelConversationByExternalId: async (id) =>
        id === 'reply-to-id@example.com' ? sampleRecord : null,
    });

    const headers: EmailHeaders = {
      messageId: 'new-msg@example.com',
      inReplyTo: 'reply-to-id@example.com',
      from: 'user@example.com',
      subject: 'Some subject',
    };

    const result = await matchToConversation(db, headers);
    expect(result).not.toBeNull();
    expect(result?.conversationId).toBe('conv-123');
  });

  it('matches by References header (strategy 2) when In-Reply-To fails', async () => {
    const db = createMockDb({
      findChannelConversationByExternalId: async () => null,
      findChannelConversationsByMetadata: async (_key, value) =>
        value === 'ref-msg@example.com' ? [sampleRecord] : [],
    });

    const headers: EmailHeaders = {
      messageId: 'new-msg@example.com',
      inReplyTo: 'unknown@example.com',
      references: ['ref-msg@example.com', 'other@example.com'],
      from: 'user@example.com',
      subject: 'Subject',
    };

    const result = await matchToConversation(db, headers);
    expect(result).not.toBeNull();
    expect(result?.conversationId).toBe('conv-123');
  });

  it('matches by subject + sender (strategy 3) as fallback', async () => {
    const db = createMockDb({
      findChannelConversationBySubjectAndSender: async (subject, sender) =>
        subject === 'compliance question' && sender === 'user@example.com'
          ? sampleRecord
          : null,
    });

    const headers: EmailHeaders = {
      messageId: 'new-msg@example.com',
      from: 'user@example.com',
      subject: 'Re: Compliance Question',
    };

    const result = await matchToConversation(db, headers);
    expect(result).not.toBeNull();
    expect(result?.conversationId).toBe('conv-123');
  });

  it('returns null when no strategy matches (new conversation)', async () => {
    const db = createMockDb();

    const headers: EmailHeaders = {
      messageId: 'brand-new@example.com',
      from: 'stranger@example.com',
      subject: 'First contact',
    };

    const result = await matchToConversation(db, headers);
    expect(result).toBeNull();
  });

  it('prefers In-Reply-To over References', async () => {
    const directMatch: ChannelConversationRecord = {
      ...sampleRecord,
      conversationId: 'conv-direct',
    };
    const refMatch: ChannelConversationRecord = {
      ...sampleRecord,
      conversationId: 'conv-ref',
    };

    const db = createMockDb({
      findChannelConversationByExternalId: async (id) =>
        id === 'direct@example.com' ? directMatch : null,
      findChannelConversationsByMetadata: async () => [refMatch],
    });

    const headers: EmailHeaders = {
      messageId: 'new@example.com',
      inReplyTo: 'direct@example.com',
      references: ['ref@example.com'],
      from: 'user@example.com',
      subject: 'Subject',
    };

    const result = await matchToConversation(db, headers);
    expect(result?.conversationId).toBe('conv-direct');
  });
});

// ---------------------------------------------------------------------------
// generateMessageId
// ---------------------------------------------------------------------------

describe('generateMessageId', () => {
  it('generates a Message-ID containing the conversation ID and domain', () => {
    const id = generateMessageId('conv-abc', 'buildpass.com.au');
    expect(id).toContain('conv-abc');
    expect(id).toContain('@buildpass.com.au');
  });

  it('generates unique IDs on successive calls', () => {
    const id1 = generateMessageId('conv-1', 'example.com');
    const id2 = generateMessageId('conv-1', 'example.com');
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// buildThreadHeaders
// ---------------------------------------------------------------------------

describe('buildThreadHeaders', () => {
  it('returns empty when no channel conversations exist', async () => {
    const db = createMockDb({
      getChannelConversationsByConversation: async () => [],
    });

    const result = await buildThreadHeaders(db, 'conv-1');
    expect(result.inReplyTo).toBeUndefined();
    expect(result.references).toEqual([]);
  });

  it('builds headers from channel conversation records', async () => {
    const records: ChannelConversationRecord[] = [
      {
        id: 'cc-1',
        channelId: 'ch-1',
        conversationId: 'conv-1',
        externalId: 'msg-1@example.com',
        externalMetadata: { messageIds: ['msg-0@example.com'] },
      },
      {
        id: 'cc-2',
        channelId: 'ch-1',
        conversationId: 'conv-1',
        externalId: 'msg-2@example.com',
        externalMetadata: {},
      },
    ];

    const db = createMockDb({
      getChannelConversationsByConversation: async () => records,
    });

    const result = await buildThreadHeaders(db, 'conv-1');
    expect(result.inReplyTo).toBe('msg-2@example.com');
    expect(result.references).toContain('msg-1@example.com');
    expect(result.references).toContain('msg-0@example.com');
    expect(result.references).toContain('msg-2@example.com');
  });

  it('deduplicates message IDs in references', async () => {
    const records: ChannelConversationRecord[] = [
      {
        id: 'cc-1',
        channelId: 'ch-1',
        conversationId: 'conv-1',
        externalId: 'msg-1@example.com',
        externalMetadata: { messageIds: ['msg-1@example.com'] },
      },
    ];

    const db = createMockDb({
      getChannelConversationsByConversation: async () => records,
    });

    const result = await buildThreadHeaders(db, 'conv-1');
    expect(result.references.filter((r) => r === 'msg-1@example.com')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// normaliseSubject
// ---------------------------------------------------------------------------

describe('normaliseSubject', () => {
  it('strips Re: prefix', () => {
    expect(normaliseSubject('Re: Hello')).toBe('hello');
  });

  it('strips Fwd: prefix', () => {
    expect(normaliseSubject('Fwd: Hello')).toBe('hello');
  });

  it('strips Fw: prefix', () => {
    expect(normaliseSubject('Fw: Hello')).toBe('hello');
  });

  it('strips all stacked Re:/Fwd: prefixes', () => {
    expect(normaliseSubject('Re: Re: Fwd: Hello')).toBe('hello');
    expect(normaliseSubject('Fwd: Re: Fwd: Re: Test')).toBe('test');
    expect(normaliseSubject('Re: Hello')).toBe('hello');
  });

  it('normalises whitespace', () => {
    expect(normaliseSubject('Re:   Extra   spaces')).toBe('extra spaces');
  });

  it('lowercases the result', () => {
    expect(normaliseSubject('UPPERCASE SUBJECT')).toBe('uppercase subject');
  });

  it('handles empty subject', () => {
    expect(normaliseSubject('')).toBe('');
  });
});
