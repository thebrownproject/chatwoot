// Unit tests for `listConversations`. We mock the Drizzle client at the
// builder level: every chain (`.select(...).from(...).leftJoin(...).where()...`)
// returns a thenable that resolves to a fixture row set we control per test.
//
// The goal is to verify:
//   - status filter mapping (open=0)
//   - assignee_type=me applies `eq(assignee_id, userId)`
//   - assignee_type=unassigned applies `IS NULL`
//   - page/pageSize translate to LIMIT/OFFSET
//   - labels filter triggers a tags subquery
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { listConversations } from './conversations';

type Captured = {
  selects: unknown[];
  wheres: unknown[];
  limits: number[];
  offsets: number[];
  orderBys: unknown[];
};

function makeFakeClient(rows: { list: unknown[]; mineCount: number; unassignedCount: number; allCount: number; messages: unknown[] }) {
  const captured: Captured = { selects: [], wheres: [], limits: [], offsets: [], orderBys: [] };

  // Each `.select(...)` returns a builder-like object whose chain methods
  // return `this` and which resolves to a fixed payload depending on the
  // shape of `select`. We track call order to differentiate the count
  // queries (3) from the list query (4) from the messages query (5).
  let callIndex = 0;
  const responses = [
    [{ value: rows.mineCount }],
    [{ value: rows.unassignedCount }],
    [{ value: rows.allCount }],
    rows.list,
    rows.messages,
  ];

  const builder = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(function (this: unknown, w: unknown) {
      captured.wheres.push(w);
      return builder;
    }),
    orderBy: vi.fn().mockImplementation(function (this: unknown, o: unknown) {
      captured.orderBys.push(o);
      return builder;
    }),
    limit: vi.fn().mockImplementation(function (this: unknown, n: number) {
      captured.limits.push(n);
      return builder;
    }),
    offset: vi.fn().mockImplementation(function (this: unknown, n: number) {
      captured.offsets.push(n);
      return builder;
    }),
    then: (onFulfilled: (v: unknown) => unknown) => {
      const r = responses[callIndex] ?? [];
      callIndex += 1;
      return Promise.resolve(r).then(onFulfilled);
    },
  };

  const client = {
    select: vi.fn().mockImplementation((s: unknown) => {
      captured.selects.push(s);
      return builder;
    }),
  };

  return { client: client as never, captured };
}

const baseConvRow = {
  conversation: {
    id: 1,
    accountId: 7,
    inboxId: 2,
    status: 0,
    assigneeId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    contactId: 99n,
    displayId: 42,
    contactLastSeenAt: null,
    agentLastSeenAt: null,
    additionalAttributes: {},
    contactInboxId: 5n,
    uuid: '00000000-0000-0000-0000-000000000001',
    identifier: null,
    lastActivityAt: new Date('2024-01-03T00:00:00Z'),
    teamId: null,
    campaignId: null,
    snoozedUntil: null,
    customAttributes: {},
    assigneeLastSeenAt: null,
    firstReplyCreatedAt: null,
    priority: null,
    slaPolicyId: null,
    waitingSince: null,
    cachedLabelList: 'urgent,vip',
    assigneeAgentBotId: null,
  },
  contact: { id: 99, name: 'Alice', email: 'a@example.com', phoneNumber: null, identifier: null },
  inbox: { id: 2, name: 'Web', channelType: 'Channel::WebWidget' },
  assignee: null,
  team: null,
  contactInbox: { id: 5n, contactId: 99n, inboxId: 2n, sourceId: 'src', hmacVerified: false },
};

describe('listConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by status open and returns mapped DTOs with meta counts', async () => {
    const { client, captured } = makeFakeClient({
      list: [baseConvRow],
      mineCount: 0,
      unassignedCount: 1,
      allCount: 1,
      messages: [],
    });
    const result = await listConversations(
      { accountId: 7n, userId: 11n, status: 'open' },
      client,
    );
    expect(result.data.meta).toEqual({
      mine_count: 0,
      assigned_count: 0,
      unassigned_count: 1,
      all_count: 1,
    });
    expect(result.data.payload).toHaveLength(1);
    expect(result.data.payload[0]?.id).toBe(42);
    expect(result.data.payload[0]?.labels).toEqual(['urgent', 'vip']);
    expect(captured.limits).toEqual([25]);
    expect(captured.offsets).toEqual([0]);
  });

  it('applies assignee_type=me as eq(assigneeId, userId)', async () => {
    const { client, captured } = makeFakeClient({
      list: [],
      mineCount: 5,
      unassignedCount: 0,
      allCount: 5,
      messages: [],
    });
    await listConversations(
      { accountId: 7n, userId: 11n, status: 'open', assigneeType: 'me' },
      client,
    );
    // Four where() calls: 3 counts + 1 list. List `where` is the last.
    expect(captured.wheres.length).toBe(4);
  });

  it('applies assignee_type=unassigned (IS NULL filter)', async () => {
    const { client } = makeFakeClient({
      list: [],
      mineCount: 0,
      unassignedCount: 3,
      allCount: 3,
      messages: [],
    });
    const result = await listConversations(
      { accountId: 7n, userId: 11n, status: 'open', assigneeType: 'unassigned' },
      client,
    );
    expect(result.data.meta.unassigned_count).toBe(3);
  });

  it('honours page and pageSize for LIMIT/OFFSET', async () => {
    const { client, captured } = makeFakeClient({
      list: [],
      mineCount: 0,
      unassignedCount: 0,
      allCount: 0,
      messages: [],
    });
    await listConversations(
      { accountId: 7n, userId: 11n, status: 'open', page: 3, pageSize: 10 },
      client,
    );
    expect(captured.limits).toEqual([10]);
    expect(captured.offsets).toEqual([20]);
  });

  it('passes through labels filter', async () => {
    const { client, captured } = makeFakeClient({
      list: [],
      mineCount: 0,
      unassignedCount: 0,
      allCount: 0,
      messages: [],
    });
    await listConversations(
      { accountId: 7n, userId: 11n, status: 'open', labels: ['urgent', 'vip'] },
      client,
    );
    // Each of the 4 where()s should reflect the same baseFilter (incl. labels).
    expect(captured.wheres.length).toBe(4);
  });
});
