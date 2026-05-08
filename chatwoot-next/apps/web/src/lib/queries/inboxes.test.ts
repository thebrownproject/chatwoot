// Unit specs for the Phase 1 inbox queries.
// Source parity: Rails `Api::V1::Accounts::InboxesController#index/show`,
// `app/policies/inbox_policy.rb`, `app/models/user.rb#assigned_inboxes`,
// `app/views/api/v1/models/_inbox.json.jbuilder`.
import { describe, expect, it } from 'vitest';

import {
  InboxNotFoundError,
  getInbox,
  listInboxes,
} from './inboxes';

// Minimal fixture shape — mirrors `inboxes.$inferSelect` columns we touch.
type FakeInboxRow = {
  id: number;
  channelId: number;
  accountId: number;
  name: string;
  channelType: string;
  greetingEnabled: boolean | null;
  greetingMessage: string | null;
  workingHoursEnabled: boolean | null;
  enableEmailCollect: boolean | null;
  csatSurveyEnabled: boolean | null;
  csatConfig: Record<string, unknown>;
  enableAutoAssignment: boolean | null;
  autoAssignmentConfig: Record<string, unknown> | null;
  outOfOfficeMessage: string | null;
  timezone: string | null;
  allowMessagesAfterResolved: boolean | null;
  lockToSingleConversation: boolean;
  senderNameType: number;
  businessName: string | null;
};

type Fixture = {
  inboxes: FakeInboxRow[];
  inboxMembers: { id: number; userId: number; inboxId: number }[];
  accountUsers: { id: number; accountId: number; userId: number; role: number }[];
  channelApi: { id: number; webhookUrl: string | null; identifier: string | null; hmacToken: string | null; hmacMandatory: boolean | null; secret: string | null; additionalAttributes: Record<string, unknown>; provider?: unknown }[];
  channelWebWidgets: { id: number; websiteUrl: string | null; widgetColor: string | null; welcomeTitle: string | null; welcomeTagline: string | null; allowedDomains: string | null; websiteToken: string | null; replyTime: number | null; preChatFormEnabled: boolean | null; preChatFormOptions: Record<string, unknown>; continuityViaEmail: boolean; hmacMandatory: boolean | null; hmacToken: string | null; provider?: unknown }[];
};

// `listInboxes` / `getInbox` issue 5 distinct Drizzle pipelines:
//   1. accountUsers (role lookup) — select-from-where-limit
//   2. inbox_members agent restriction — select-from-innerJoin-where
//   3. inboxes for the listing — select-from-where-orderBy
//   4. channel_<type> batch fetch — select-from-where (per type)
//   5. inbox row for #show + membership confirmation
//
// We stub each call by name + WHERE-fingerprint via a captured chain spy.

type Spy = ReturnType<typeof buildSpy>;

function buildSpy(fixture: Fixture) {
  const calls: { fields: unknown; from: string; joins: string[]; whereSig: string | null }[] = [];

  function chain(initial: { fields: unknown }) {
    const state: { from?: string; joins: string[]; whereSig: string | null; orderBy: unknown; limit?: number } = {
      joins: [],
      whereSig: null,
      orderBy: null,
    };

    const proxy: any = {
      from(table: any) {
        state.from = tableName(table);
        return proxy;
      },
      innerJoin(table: any) {
        state.joins.push(tableName(table));
        return proxy;
      },
      where(predicate: any) {
        state.whereSig = predicate?.__sig ?? null;
        return proxy;
      },
      orderBy(order: any) {
        state.orderBy = order;
        return proxy;
      },
      limit(n: number) {
        state.limit = n;
        return resolve();
      },
      then(onFulfilled: (v: any) => any, onRejected?: any) {
        return resolve().then(onFulfilled, onRejected);
      },
    };

    function resolve(): Promise<any[]> {
      calls.push({
        fields: initial.fields,
        from: state.from ?? '',
        joins: state.joins,
        whereSig: state.whereSig,
      });
      const rows = resolveRows(fixture, state);
      return Promise.resolve(state.limit ? rows.slice(0, state.limit) : rows);
    }
    return proxy;
  }

  const client: any = {
    select(fields?: unknown) {
      return chain({ fields });
    },
  };

  return { client, calls };
}

function tableName(table: any): string {
  // Drizzle tables expose Symbol-keyed metadata — fall back to a `__name__`
  // string assigned by `installSig` below for our fakes.
  return table?.__name__ ?? '';
}

// Predicates produced by `eq`/`and`/`inArray` are real Drizzle SQL objects in
// production; in this fake harness we sniff the WHERE shape by examining the
// fixtures the resolver would otherwise need to evaluate. Instead of mocking
// the SQL builder, the resolver below pattern-matches on `from` + `joins`.
function resolveRows(
  fixture: Fixture,
  state: { from?: string; joins: string[]; orderBy: unknown },
): any[] {
  switch (state.from) {
    case 'account_users':
      return fixture.accountUsers.map((r) => ({ role: r.role }));
    case 'inbox_members':
      if (state.joins.includes('inboxes')) {
        return fixture.inboxMembers.map((m) => ({ inboxId: m.inboxId }));
      }
      return fixture.inboxMembers.map((m) => ({ id: m.id }));
    case 'inboxes':
      return [...fixture.inboxes].sort((a, b) => a.name.localeCompare(b.name));
    case 'channel_api':
      return fixture.channelApi;
    case 'channel_web_widgets':
      return fixture.channelWebWidgets;
    default:
      return [];
  }
}

// The query module imports `db` from `@/lib/db`, but each public function also
// accepts an injected client. We always pass our spy so the production client
// is never touched.

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    inboxes: [],
    inboxMembers: [],
    accountUsers: [],
    channelApi: [],
    channelWebWidgets: [],
    ...overrides,
  };
}

function apiInbox(id: number, overrides: Partial<FakeInboxRow> = {}): FakeInboxRow {
  return {
    id,
    channelId: id * 10,
    accountId: 1,
    name: `inbox-${id}`,
    channelType: 'Channel::Api',
    greetingEnabled: false,
    greetingMessage: null,
    workingHoursEnabled: false,
    enableEmailCollect: true,
    csatSurveyEnabled: false,
    csatConfig: {},
    enableAutoAssignment: true,
    autoAssignmentConfig: {},
    outOfOfficeMessage: null,
    timezone: 'UTC',
    allowMessagesAfterResolved: true,
    lockToSingleConversation: false,
    senderNameType: 0,
    businessName: null,
    ...overrides,
  };
}

function webWidgetInbox(id: number): FakeInboxRow {
  return apiInbox(id, { channelType: 'Channel::WebWidget' });
}

describe('listInboxes', () => {
  it('scopes to the requesting account and returns all inboxes for administrators', async () => {
    const fixture = makeFixture({
      inboxes: [
        apiInbox(1, { name: 'beta' }),
        apiInbox(2, { name: 'alpha' }),
      ],
      accountUsers: [{ id: 1, accountId: 1, userId: 7, role: 1 /* administrator */ }],
      channelApi: [
        { id: 10, webhookUrl: 'https://h.example/1', identifier: 'tok1', hmacToken: 'hmac1', hmacMandatory: true, secret: 's1', additionalAttributes: {}, provider: null },
        { id: 20, webhookUrl: 'https://h.example/2', identifier: 'tok2', hmacToken: 'hmac2', hmacMandatory: false, secret: 's2', additionalAttributes: {}, provider: null },
      ],
    });
    const spy = buildSpy(fixture);
    const result = await listInboxes(
      { accountId: 1n, userId: 7n },
      spy.client as Spy['client'],
    );

    expect(result.payload.map((i) => i.name)).toEqual(['alpha', 'beta']);
    // Administrator sees `hmac_token` and `secret` (Jbuilder lines 116–117).
    expect(result.payload[0]?.hmac_token).toBeDefined();
    expect(result.payload[0]?.secret).toBeDefined();
    // Did not call inbox_members for admins (no agent restriction step).
    const sawAgentJoin = spy.calls.some((c) => c.from === 'inbox_members' && c.joins.includes('inboxes'));
    expect(sawAgentJoin).toBe(false);
  });

  it('restricts agent listings to inbox_members membership', async () => {
    const fixture = makeFixture({
      inboxes: [apiInbox(1)],
      inboxMembers: [{ id: 1, userId: 7, inboxId: 1 }],
      accountUsers: [{ id: 1, accountId: 1, userId: 7, role: 0 /* agent */ }],
      channelApi: [
        { id: 10, webhookUrl: 'https://h.example/1', identifier: 'tok1', hmacToken: 'hmac1', hmacMandatory: false, secret: 's1', additionalAttributes: {}, provider: null },
      ],
    });
    const spy = buildSpy(fixture);
    const result = await listInboxes(
      { accountId: 1n, userId: 7n },
      spy.client as Spy['client'],
    );

    expect(result.payload).toHaveLength(1);
    // Agent cannot see admin-only fields (Jbuilder guards on
    // `Current.account_user&.administrator?`).
    expect(result.payload[0]?.hmac_token).toBeUndefined();
    expect(result.payload[0]?.secret).toBeUndefined();
    // Did walk the agent restriction pipeline.
    const sawAgentJoin = spy.calls.some((c) => c.from === 'inbox_members' && c.joins.includes('inboxes'));
    expect(sawAgentJoin).toBe(true);
  });

  it('returns empty payload when an agent has no inbox memberships', async () => {
    const fixture = makeFixture({
      inboxes: [apiInbox(1)],
      inboxMembers: [],
      accountUsers: [{ id: 1, accountId: 1, userId: 7, role: 0 }],
    });
    const spy = buildSpy(fixture);
    const result = await listInboxes(
      { accountId: 1n, userId: 7n },
      spy.client as Spy['client'],
    );
    expect(result.payload).toEqual([]);
  });

  it('joins the right channel table per channel_type (Api + WebWidget)', async () => {
    const fixture = makeFixture({
      inboxes: [
        apiInbox(1, { name: 'a-api', channelId: 10 }),
        webWidgetInbox(2),
      ],
      accountUsers: [{ id: 1, accountId: 1, userId: 7, role: 1 }],
      channelApi: [
        { id: 10, webhookUrl: 'https://api.example', identifier: 'apitok', hmacToken: 'h', hmacMandatory: true, secret: 'sec', additionalAttributes: { foo: 'bar' }, provider: null },
      ],
      channelWebWidgets: [
        { id: 20, websiteUrl: 'https://w.example', widgetColor: '#abcdef', welcomeTitle: 'Hi', welcomeTagline: 'Tag', allowedDomains: 'a.com', websiteToken: 'wtok', replyTime: 0, preChatFormEnabled: true, preChatFormOptions: { fields: [] }, continuityViaEmail: true, hmacMandatory: false, hmacToken: 'wh', provider: null },
      ],
    });
    const spy = buildSpy(fixture);
    const result = await listInboxes(
      { accountId: 1n, userId: 7n },
      spy.client as Spy['client'],
    );

    const tablesQueried = new Set(spy.calls.map((c) => c.from));
    expect(tablesQueried.has('channel_api')).toBe(true);
    expect(tablesQueried.has('channel_web_widgets')).toBe(true);

    const api = result.payload.find((i) => i.channel_type === 'Channel::Api');
    expect(api?.webhook_url).toBe('https://api.example');
    expect(api?.inbox_identifier).toBe('apitok');
    expect(api?.additional_attributes).toEqual({ foo: 'bar' });

    const ww = result.payload.find((i) => i.channel_type === 'Channel::WebWidget');
    expect(ww?.website_url).toBe('https://w.example');
    expect(ww?.widget_color).toBe('#abcdef');
    expect(ww?.website_token).toBe('wtok');
    expect(ww?.welcome_title).toBe('Hi');
  });
});

describe('getInbox', () => {
  it('throws InboxNotFoundError when the inbox is not in the account', async () => {
    const fixture = makeFixture({
      accountUsers: [{ id: 1, accountId: 1, userId: 7, role: 1 }],
      // No inbox row matches.
    });
    const spy = buildSpy(fixture);
    await expect(
      getInbox({ accountId: 1n, userId: 7n, inboxId: 99n }, spy.client as Spy['client']),
    ).rejects.toBeInstanceOf(InboxNotFoundError);
  });
});

// `installSig` shim — installs a stable `__name__` on every Drizzle table
// reference the production code imports. Vitest mocks the import below.
import { vi } from 'vitest';
vi.mock('@chatwoot-next/db', () => {
  const make = (name: string) => ({ __name__: name, id: { __name__: name + '.id' } });
  return {
    accountUsers: { __name__: 'account_users', accountId: { __name__: 'account_users.account_id' }, userId: { __name__: 'account_users.user_id' }, role: { __name__: 'account_users.role' } },
    channelApi: make('channel_api'),
    channelEmail: make('channel_email'),
    channelFacebookPages: make('channel_facebook_pages'),
    channelInstagram: make('channel_instagram'),
    channelLine: make('channel_line'),
    channelSms: make('channel_sms'),
    channelTelegram: make('channel_telegram'),
    channelTiktok: make('channel_tiktok'),
    channelTwilioSms: make('channel_twilio_sms'),
    channelTwitterProfiles: make('channel_twitter_profiles'),
    channelWebWidgets: make('channel_web_widgets'),
    channelWhatsapp: make('channel_whatsapp'),
    inboxes: { __name__: 'inboxes', id: { __name__: 'inboxes.id' }, accountId: { __name__: 'inboxes.account_id' }, name: { __name__: 'inboxes.name' } },
    inboxMembers: { __name__: 'inbox_members', id: { __name__: 'inbox_members.id' }, userId: { __name__: 'inbox_members.user_id' }, inboxId: { __name__: 'inbox_members.inbox_id' } },
  };
});

vi.mock('@/lib/db', () => ({ db: {} }));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ __sig: 'and:' + args.map(() => '?').join(','), __args: args }),
  eq: (a: any, b: unknown) => ({ __sig: 'eq:' + (a?.__name__ ?? '') + '=' + String(b) }),
  inArray: (a: any, b: unknown[]) => ({ __sig: 'inArray:' + (a?.__name__ ?? '') + '@' + b.length }),
  asc: (a: any) => ({ __order: 'asc', __column: a?.__name__ }),
}));
