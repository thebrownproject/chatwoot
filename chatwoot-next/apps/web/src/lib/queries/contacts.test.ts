// Unit tests for the contacts list query helpers. We exercise the pure helpers
// (sort parsing) directly and stub a minimal Drizzle-shaped client to verify
// pagination math, ILIKE composition, and meta count plumbing.
import { describe, expect, it, vi } from 'vitest';
import {
  CONTACT_SORT_FIELDS,
  DEFAULT_CONTACT_PAGE_SIZE,
  InvalidContactSortError,
  listContacts,
  parseContactSort,
} from './contacts';

describe('parseContactSort', () => {
  it('returns null for empty input', () => {
    expect(parseContactSort(undefined)).toBeNull();
    expect(parseContactSort('')).toBeNull();
    expect(parseContactSort('   ')).toBeNull();
  });

  it('parses an ascending sort', () => {
    expect(parseContactSort('name')).toEqual({ field: 'name', direction: 'asc' });
  });

  it('parses a descending sort with the leading dash', () => {
    expect(parseContactSort('-last_activity_at')).toEqual({
      field: 'last_activity_at',
      direction: 'desc',
    });
  });

  it('accepts every whitelisted field', () => {
    for (const field of Object.keys(CONTACT_SORT_FIELDS)) {
      expect(parseContactSort(field)?.field).toBe(field);
    }
  });

  it('throws InvalidContactSortError on unknown fields', () => {
    expect(() => parseContactSort('phone_number')).toThrow(InvalidContactSortError);
    expect(() => parseContactSort('-not_a_field')).toThrow(InvalidContactSortError);
  });
});

type ChainResult = unknown[];

function buildFakeClient(rows: ChainResult, total: number) {
  // Captured arguments for assertions. The chain mirrors drizzle's builder
  // pattern just enough for `listContacts` to run.
  const captured: {
    selectCalls: unknown[];
    whereArgs: unknown[];
    limit?: number;
    offset?: number;
    orderArg?: unknown;
  } = { selectCalls: [], whereArgs: [] };

  const offsetFn = vi.fn(async function offset(value: number) {
    captured.offset = value;
    return rows;
  });
  const limitFn = vi.fn(function limit(value: number) {
    captured.limit = value;
    return { offset: offsetFn };
  });
  const orderByFn = vi.fn(function orderBy(arg: unknown) {
    captured.orderArg = arg;
    return { limit: limitFn };
  });
  const whereForRowsFn = vi.fn(function where(arg: unknown) {
    captured.whereArgs.push(arg);
    return { orderBy: orderByFn };
  });
  const fromForRowsFn = vi.fn(function from() {
    return { where: whereForRowsFn };
  });

  // Count branch: db.select({ value: count() }).from(...).where(...)
  const whereForCountFn = vi.fn(async function whereCount(arg: unknown) {
    captured.whereArgs.push(arg);
    return [{ value: total }];
  });
  const fromForCountFn = vi.fn(function fromCount() {
    return { where: whereForCountFn };
  });

  let selectCallIndex = 0;
  const select = vi.fn(function selectImpl(arg?: unknown) {
    captured.selectCalls.push(arg);
    selectCallIndex += 1;
    if (selectCallIndex === 1) return { from: fromForRowsFn };
    return { from: fromForCountFn };
  });

  return { client: { select } as unknown as Parameters<typeof listContacts>[1], captured };
}

describe('listContacts', () => {
  it('paginates with the default page size and returns meta', async () => {
    const { client, captured } = buildFakeClient([], 0);
    const result = await listContacts({ accountId: 7n }, client);

    expect(captured.limit).toBe(DEFAULT_CONTACT_PAGE_SIZE);
    expect(captured.offset).toBe(0);
    expect(result.meta).toEqual({ count: 0, current_page: 1, page_count: 1 });
  });

  it('honors explicit page + pageSize and computes page_count', async () => {
    const { client, captured } = buildFakeClient([], 47);
    const result = await listContacts(
      { accountId: 7n, page: 2, pageSize: 10 },
      client,
    );
    expect(captured.limit).toBe(10);
    expect(captured.offset).toBe(10);
    expect(result.meta).toEqual({ count: 47, current_page: 2, page_count: 5 });
  });

  it('coerces invalid pages back to 1 and pageSize to >=1', async () => {
    const { client, captured } = buildFakeClient([], 0);
    await listContacts({ accountId: 1n, page: -3, pageSize: 0 }, client);
    expect(captured.offset).toBe(0);
    expect(captured.limit).toBe(1);
  });

  it('passes a WHERE clause to both the rows and count queries', async () => {
    const { client, captured } = buildFakeClient([], 0);
    await listContacts({ accountId: 1n, q: 'ada' }, client);
    expect(captured.whereArgs).toHaveLength(2);
    expect(captured.whereArgs[0]).toBe(captured.whereArgs[1]);
  });

  it('throws InvalidContactSortError for non-whitelisted sort fields', async () => {
    const { client } = buildFakeClient([], 0);
    await expect(
      listContacts({ accountId: 1n, sort: 'evil' }, client),
    ).rejects.toBeInstanceOf(InvalidContactSortError);
  });

  it('maps a row into the contact DTO shape with bigint-safe id', async () => {
    const row = {
      id: 42,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+15551234567',
      identifier: 'ada-1',
      additionalAttributes: { city: 'London' },
      customAttributes: { plan: 'pro' },
      createdAt: new Date('2024-01-02T03:04:05Z'),
      lastActivityAt: new Date(Date.now() - 1000),
    };
    const { client } = buildFakeClient([row], 1);
    const result = await listContacts({ accountId: 1n }, client);
    expect(result.data.contacts).toHaveLength(1);
    const dto = result.data.contacts[0]!;
    expect(dto.id).toBe('42');
    expect(typeof dto.id).toBe('string');
    expect(dto.created_at).toBe(Math.floor(row.createdAt.getTime() / 1000));
    expect(dto.availability).toBe('online');
  });
});
