// GET (list) + POST (create) conversations within an account.
// Source parity: Rails `Api::V1::Accounts::ConversationsController#index/create`
// (`config/routes.rb` -> resources :conversations). The GET handler is a
// read-only Phase 1 strangler-fig port; POST stays a 501 stub until Phase 3.
import { withAccount } from '@/lib/api/withAccount';
import {
  DEFAULT_PAGE_SIZE,
  listConversations,
  type AssigneeType,
  type ConversationStatus,
} from '@/lib/queries/conversations';

const STATUS_VALUES: ReadonlySet<ConversationStatus> = new Set([
  'open',
  'resolved',
  'pending',
  'snoozed',
  'all',
]);
const ASSIGNEE_TYPE_VALUES: ReadonlySet<AssigneeType> = new Set(['me', 'unassigned', 'assigned']);

function toBigInt(raw: string | null): bigint | undefined {
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

function toPositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export const GET = withAccount(async (req, ctx) => {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const statusRaw = sp.get('status');
  const status =
    statusRaw && STATUS_VALUES.has(statusRaw as ConversationStatus)
      ? (statusRaw as ConversationStatus)
      : undefined;

  const assigneeTypeRaw = sp.get('assignee_type');
  const assigneeType =
    assigneeTypeRaw && ASSIGNEE_TYPE_VALUES.has(assigneeTypeRaw as AssigneeType)
      ? (assigneeTypeRaw as AssigneeType)
      : undefined;

  const labelsRaw = sp.getAll('labels[]').concat(sp.getAll('labels'));
  const labels = labelsRaw.flatMap((l) => l.split(',').map((s) => s.trim()).filter(Boolean));

  const result = await listConversations({
    accountId: ctx.accountId,
    userId: ctx.userId,
    page: toPositiveInt(sp.get('page'), 1),
    pageSize: toPositiveInt(sp.get('page_size'), DEFAULT_PAGE_SIZE),
    ...(status ? { status } : {}),
    ...(assigneeType ? { assigneeType } : {}),
    ...((): { inboxId?: bigint } => {
      const v = toBigInt(sp.get('inbox_id'));
      return v === undefined ? {} : { inboxId: v };
    })(),
    ...((): { teamId?: bigint } => {
      const v = toBigInt(sp.get('team_id'));
      return v === undefined ? {} : { teamId: v };
    })(),
    ...(labels.length > 0 ? { labels } : {}),
    ...((): { q?: string } => {
      const q = sp.get('q')?.trim();
      return q ? { q } : {};
    })(),
    ...((): { updatedWithin?: number } => {
      const raw = sp.get('updated_within');
      if (!raw) return {};
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return {};
      return { updatedWithin: Math.floor(n) };
    })(),
  });

  return Response.json(result);
});

export const POST = withAccount(async () =>
  Response.json({ error: 'not implemented' }, { status: 501 }),
);
