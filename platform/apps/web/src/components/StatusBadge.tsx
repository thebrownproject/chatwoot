import type { ConversationStatus } from '@buildpass/shell';

const statusConfig: Record<
  ConversationStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  open: { label: 'Open', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  snoozed: { label: 'Snoozed', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  resolved: {
    label: 'Resolved',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
};

interface StatusBadgeProps {
  status: ConversationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
