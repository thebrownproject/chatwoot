'use client';

import {
  Inbox,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
  Tag,
  Settings,
} from 'lucide-react';
import type { InboxView, ConversationStatus, ChannelType } from '../types';
import { channelIcons, channelLabels } from '../lib/channels';

interface SidebarProps {
  currentView: InboxView;
  onViewChange: (view: InboxView) => void;
  statusFilter: ConversationStatus | null;
  onStatusFilterChange: (status: ConversationStatus | null) => void;
  channelFilter: ChannelType | null;
  onChannelFilterChange: (channel: ChannelType | null) => void;
  labelFilter: string | null;
  onLabelFilterChange: (label: string | null) => void;
  labels?: Array<{ id: string; name: string; color: string | null }>;
  teams?: Array<{ id: string; name: string }>;
  counts?: {
    mine: number;
    unassigned: number;
    all: number;
  } | undefined;
}

const inboxViews: Array<{ id: InboxView; label: string; icon: typeof Inbox }> = [
  { id: 'mine', label: 'My Inbox', icon: Inbox },
  { id: 'unassigned', label: 'Unassigned', icon: Users },
  { id: 'all', label: 'All Conversations', icon: MessageSquare },
];

const statusFilters: Array<{ id: ConversationStatus; label: string; icon: typeof Clock }> = [
  { id: 'open', label: 'Open', icon: MessageSquare },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'snoozed', label: 'Snoozed', icon: Clock },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
];

export function Sidebar({
  currentView,
  onViewChange,
  statusFilter,
  onStatusFilterChange,
  channelFilter,
  onChannelFilterChange,
  labelFilter,
  onLabelFilterChange,
  labels = [],
  teams = [],
  counts,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-300">
      <div className="flex h-14 items-center gap-2 border-b border-slate-700 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          B
        </div>
        <span className="text-sm font-semibold text-white">Buildpass</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <section>
          <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Inbox
          </h3>
          {inboxViews.map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            const count = counts?.[view.id];
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{view.label}</span>
                {count !== undefined && count > 0 && (
                  <span className="rounded-full bg-slate-600 px-1.5 py-0.5 text-xs font-medium text-slate-200">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </section>

        <section className="mt-5">
          <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Status
          </h3>
          {statusFilters.map((s) => {
            const Icon = s.icon;
            const isActive = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onStatusFilterChange(isActive ? null : s.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{s.label}</span>
              </button>
            );
          })}
        </section>

        <section className="mt-5">
          <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Channels
          </h3>
          {(Object.keys(channelIcons) as ChannelType[]).map((ch) => {
            const Icon = channelIcons[ch];
            const isActive = channelFilter === ch;
            return (
              <button
                key={ch}
                onClick={() => onChannelFilterChange(isActive ? null : ch)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{channelLabels[ch]}</span>
              </button>
            );
          })}
        </section>

        {labels.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Labels
            </h3>
            {labels.map((label) => {
              const isActive = labelFilter === label.id;
              return (
                <button
                  key={label.id}
                  onClick={() => onLabelFilterChange(isActive ? null : label.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Tag className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{label.name}</span>
                  {label.color && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                  )}
                </button>
              );
            })}
          </section>
        )}

        {teams.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Teams
            </h3>
            {teams.map((team) => (
              <button
                key={team.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{team.name}</span>
              </button>
            ))}
          </section>
        )}
      </nav>

      <div className="border-t border-slate-700 px-2 py-2">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
