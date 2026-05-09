'use client';

import { Calendar, Clock } from 'lucide-react';
import type { Conversation, User, Label, ConversationStatus, ConversationPriority } from '@buildpass/shell';
import { channelIcons, channelLabels, initials, capitalize, formatDate } from '@buildpass/shell';
import { StatusBadge } from './StatusBadge';
import { AssigneeSelector } from './AssigneeSelector';
import { LabelPicker } from './LabelPicker';

interface ConversationDetailsProps {
  conversation: Conversation;
  agents: User[];
  availableLabels: Label[];
  onAssign: (userId: string | null) => void;
  onStatusChange: (status: ConversationStatus) => void;
  onAddLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
}

const statusTransitions: Record<ConversationStatus, ConversationStatus[]> = {
  open: ['pending', 'snoozed', 'resolved'],
  pending: ['open', 'snoozed', 'resolved'],
  snoozed: ['open'],
  resolved: ['open'],
};

const priorityStyles: Record<ConversationPriority, string> = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-yellow-50 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
};

export function ConversationDetails({
  conversation,
  agents,
  availableLabels,
  onAssign,
  onStatusChange,
  onAddLabel,
  onRemoveLabel,
}: ConversationDetailsProps) {
  const ChannelIcon = channelIcons[conversation.channelOrigin];
  const transitions = statusTransitions[conversation.status];

  return (
    <aside className="flex h-full w-80 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Conversation Details</h3>
        <p className="mt-0.5 text-xs text-slate-400">#{conversation.displayId}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-5">
          {conversation.contact && (
            <div>
              <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                Contact
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                  {initials(conversation.contact.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {conversation.contact.name}
                  </p>
                  {conversation.contact.email && (
                    <p className="text-xs text-slate-500">{conversation.contact.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Status
            </h4>
            <div className="flex items-center gap-2">
              <StatusBadge status={conversation.status} />
              <div className="flex gap-1">
                {transitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    {capitalize(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Channel
            </h4>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <ChannelIcon className="h-4 w-4 text-slate-400" />
              {channelLabels[conversation.channelOrigin]}
            </div>
          </div>

          <div>
            <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Priority
            </h4>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[conversation.priority]}`}
            >
              {capitalize(conversation.priority)}
            </span>
          </div>

          <AssigneeSelector
            currentAssignee={conversation.assignee}
            agents={agents}
            onAssign={onAssign}
          />

          <LabelPicker
            currentLabels={conversation.labels ?? []}
            availableLabels={availableLabels}
            onAdd={onAddLabel}
            onRemove={onRemoveLabel}
          />

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {formatDate(conversation.createdAt)}</span>
            </div>
            {conversation.firstReplyAt && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>First reply {formatDate(conversation.firstReplyAt)}</span>
              </div>
            )}
            {conversation.resolvedAt && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Resolved {formatDate(conversation.resolvedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
