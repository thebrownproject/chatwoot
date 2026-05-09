'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { InboxView, ConversationStatus, ChannelType, User, Label, Team } from '../types';

interface AppLayoutProps {
  children: ReactNode;
  user?: User | null;
  labels?: Label[];
  teams?: Team[];
  counts?: { mine: number; unassigned: number; all: number };
  currentView?: InboxView;
  onViewChange?: (view: InboxView) => void;
  statusFilter?: ConversationStatus | null;
  onStatusFilterChange?: (status: ConversationStatus | null) => void;
  channelFilter?: ChannelType | null;
  onChannelFilterChange?: (channel: ChannelType | null) => void;
  labelFilter?: string | null;
  onLabelFilterChange?: (label: string | null) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function AppLayout({
  children,
  user,
  labels = [],
  teams = [],
  counts,
  currentView: controlledView,
  onViewChange: controlledOnViewChange,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange: controlledOnStatusFilterChange,
  channelFilter: controlledChannelFilter,
  onChannelFilterChange: controlledOnChannelFilterChange,
  labelFilter: controlledLabelFilter,
  onLabelFilterChange: controlledOnLabelFilterChange,
  searchQuery: controlledSearchQuery,
  onSearchChange: controlledOnSearchChange,
}: AppLayoutProps) {
  const [internalView, setInternalView] = useState<InboxView>('mine');
  const [internalStatusFilter, setInternalStatusFilter] = useState<ConversationStatus | null>(null);
  const [internalChannelFilter, setInternalChannelFilter] = useState<ChannelType | null>(null);
  const [internalLabelFilter, setInternalLabelFilter] = useState<string | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  const view = controlledView ?? internalView;
  const onViewChange = controlledOnViewChange ?? setInternalView;
  const statusFilter = controlledStatusFilter ?? internalStatusFilter;
  const onStatusFilterChange = controlledOnStatusFilterChange ?? setInternalStatusFilter;
  const channelFilter = controlledChannelFilter ?? internalChannelFilter;
  const onChannelFilterChange = controlledOnChannelFilterChange ?? setInternalChannelFilter;
  const labelFilter = controlledLabelFilter ?? internalLabelFilter;
  const onLabelFilterChange = controlledOnLabelFilterChange ?? setInternalLabelFilter;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const onSearchChange = controlledOnSearchChange ?? setInternalSearchQuery;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar
        currentView={view}
        onViewChange={onViewChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        channelFilter={channelFilter}
        onChannelFilterChange={onChannelFilterChange}
        labelFilter={labelFilter}
        onLabelFilterChange={onLabelFilterChange}
        labels={labels}
        teams={teams}
        counts={counts}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <main className="flex flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
