// Phase 1 read-only port of Rails `Api::V1::Accounts::ContactsController#index`
// (`app/controllers/api/v1/accounts/contacts_controller.rb`,
// `app/views/api/v1/models/_contact.json.jbuilder`).
//
// Drizzle: builds the WHERE/ORDER/LIMIT predicate from the `ContactListParams`
// passed in by the route handler. The route is responsible for parsing the
// `searchParams` and rejecting unknown sort keys with a 400.
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
// `contacts` and `contactInboxes` live in the `@chatwoot-next/db` package but
// are not yet re-exported through its `./schema` barrel (the barrel currently
// only re-exports the empty `tables.ts` stub). Until the package's barrel is
// expanded, we reach into the source files directly.
import { contacts } from '../../../../../packages/db/src/schema/contacts';
import { contactInboxes } from '../../../../../packages/db/src/schema/inboxes';
import { db } from '@/lib/db';

export const CONTACT_INCLUDE_OPTIONS = ['contact_inboxes'] as const;
export type ContactInclude = (typeof CONTACT_INCLUDE_OPTIONS)[number];

// Sift-equivalent allow-list. Rails declares these via `sort_on` in the
// controller; we only port the four called out for Phase 1.
export const CONTACT_SORT_FIELDS = {
  name: contacts.name,
  email: contacts.email,
  last_activity_at: contacts.lastActivityAt,
  created_at: contacts.createdAt,
} as const;

export type ContactSortField = keyof typeof CONTACT_SORT_FIELDS;

export const DEFAULT_CONTACT_PAGE_SIZE = 25;

export type ContactListParams = {
  accountId: bigint;
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
  include?: ContactInclude[];
};

export type ContactInboxDto = {
  id: string;
  contact_id: string | null;
  inbox_id: string | null;
  source_id: string;
};

export type ContactDto = {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  identifier: string | null;
  additional_attributes: unknown;
  custom_attributes: unknown;
  created_at: number | null;
  // Rails computes this from Redis (`OnlineStatusTracker`); we approximate with
  // `last_activity_at` proximity (no `last_seen_at` column exists on contacts).
  availability: 'online' | 'offline';
  contact_inboxes?: ContactInboxDto[];
};

export type ContactListResult = {
  data: { contacts: ContactDto[] };
  meta: {
    count: number;
    current_page: number;
    page_count: number;
  };
};

const ONLINE_THRESHOLD_MS = 60_000;

export class InvalidContactSortError extends Error {
  constructor(public readonly field: string) {
    super(`Unknown contact sort field: ${field}`);
    this.name = 'InvalidContactSortError';
  }
}

type ParsedSort = { field: ContactSortField; direction: 'asc' | 'desc' };

export function parseContactSort(raw: string | undefined): ParsedSort | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const direction: 'asc' | 'desc' = trimmed.startsWith('-') ? 'desc' : 'asc';
  const field = (direction === 'desc' ? trimmed.slice(1) : trimmed) as ContactSortField;
  if (!(field in CONTACT_SORT_FIELDS)) {
    throw new InvalidContactSortError(field);
  }
  return { field, direction };
}

function buildWhere(params: ContactListParams): SQL {
  const accountFilter = eq(contacts.accountId, Number(params.accountId));
  const q = params.q?.trim();
  if (!q) return accountFilter;

  // Mirrors Rails: `name ILIKE :s OR email ILIKE :s OR phone_number ILIKE :s OR
  // contacts.identifier LIKE :s` (Rails uses LIKE on identifier; we use ILIKE
  // for consistency with the other three columns and Postgres semantics).
  const needle = `%${q}%`;
  const search = or(
    ilike(contacts.name, needle),
    ilike(contacts.email, needle),
    ilike(contacts.phoneNumber, needle),
    ilike(contacts.identifier, needle),
  )!;
  return and(accountFilter, search)!;
}

function toContactDto(row: typeof contacts.$inferSelect, now: number): ContactDto {
  const lastActivityMs = row.lastActivityAt?.getTime() ?? 0;
  const availability: ContactDto['availability'] =
    lastActivityMs > 0 && now - lastActivityMs <= ONLINE_THRESHOLD_MS ? 'online' : 'offline';

  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone_number: row.phoneNumber,
    identifier: row.identifier,
    additional_attributes: row.additionalAttributes ?? {},
    custom_attributes: row.customAttributes ?? {},
    created_at: row.createdAt ? Math.floor(row.createdAt.getTime() / 1000) : null,
    availability,
  };
}

export async function listContacts(
  params: ContactListParams,
  client: typeof db = db,
): Promise<ContactListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_CONTACT_PAGE_SIZE);
  const sort = parseContactSort(params.sort);
  const where = buildWhere(params);

  const orderClause =
    sort === null
      ? desc(contacts.id)
      : sort.direction === 'asc'
        ? asc(CONTACT_SORT_FIELDS[sort.field])
        : desc(CONTACT_SORT_FIELDS[sort.field]);

  const rows = await client
    .select()
    .from(contacts)
    .where(where)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [countRow] = await client.select({ value: count() }).from(contacts).where(where);
  const total = Number(countRow?.value ?? 0);
  const now = Date.now();
  const dtos = rows.map((row) => toContactDto(row, now));

  if (params.include?.includes('contact_inboxes') && dtos.length > 0) {
    const ids = rows.map((row) => row.id);
    const inboxRows = await client
      .select()
      .from(contactInboxes)
      .where(inContactIds(ids));
    const grouped = new Map<string, ContactInboxDto[]>();
    for (const ib of inboxRows) {
      const key = String(ib.contactId ?? '');
      const list = grouped.get(key) ?? [];
      list.push({
        id: String(ib.id),
        contact_id: ib.contactId === null ? null : String(ib.contactId),
        inbox_id: ib.inboxId === null ? null : String(ib.inboxId),
        source_id: ib.sourceId,
      });
      grouped.set(key, list);
    }
    for (const dto of dtos) {
      dto.contact_inboxes = grouped.get(dto.id) ?? [];
    }
  }

  return {
    data: { contacts: dtos },
    meta: {
      count: total,
      current_page: page,
      page_count: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function inContactIds(ids: number[]): SQL {
  return inArray(contactInboxes.contactId, ids.map((id) => BigInt(id)));
}
