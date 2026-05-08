'use client';

import { useState, useCallback, type ReactNode } from 'react';
import {
  AppLayout,
  type InboxView,
  type ConversationStatus,
  type ChannelType,
  type User,
  type Label,
  type Team,
} from '@buildpass/shell';

// Mock data for initial development -- will be replaced by API calls
const mockUser: User = {
  id: '1',
  type: 'human_agent',
  name: 'Fraser Brown',
  email: 'fraserbrown@live.com',
  avatarUrl: null,
};

const mockLabels: Label[] = [
  { id: 'l1', name: 'billing', color: '#3b82f6' },
  { id: 'l2', name: 'onboarding', color: '#10b981' },
  { id: 'l3', name: 'bug', color: '#ef4444' },
  { id: 'l4', name: 'feature-request', color: '#8b5cf6' },
];

const mockTeams: Team[] = [
  { id: 't1', name: 'Support' },
  { id: 't2', name: 'Engineering' },
];

interface ShellState {
  view: InboxView;
  statusFilter: ConversationStatus | null;
  channelFilter: ChannelType | null;
  labelFilter: string | null;
  searchQuery: string;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShellState>({
    view: 'mine',
    statusFilter: null,
    channelFilter: null,
    labelFilter: null,
    searchQuery: '',
  });

  const setView = useCallback((view: InboxView) => {
    setState((s) => ({ ...s, view }));
  }, []);

  const setStatusFilter = useCallback((statusFilter: ConversationStatus | null) => {
    setState((s) => ({ ...s, statusFilter }));
  }, []);

  const setChannelFilter = useCallback((channelFilter: ChannelType | null) => {
    setState((s) => ({ ...s, channelFilter }));
  }, []);

  const setLabelFilter = useCallback((labelFilter: string | null) => {
    setState((s) => ({ ...s, labelFilter }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setState((s) => ({ ...s, searchQuery }));
  }, []);

  return (
    <AppLayout
      user={mockUser}
      labels={mockLabels}
      teams={mockTeams}
      counts={{ mine: 12, unassigned: 5, all: 34 }}
      currentView={state.view}
      onViewChange={setView}
      statusFilter={state.statusFilter}
      onStatusFilterChange={setStatusFilter}
      channelFilter={state.channelFilter}
      onChannelFilterChange={setChannelFilter}
      labelFilter={state.labelFilter}
      onLabelFilterChange={setLabelFilter}
      searchQuery={state.searchQuery}
      onSearchChange={setSearchQuery}
    >
      {children}
    </AppLayout>
  );
}
