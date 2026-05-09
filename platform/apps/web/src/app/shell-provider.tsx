'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  AppLayout,
  type InboxView,
  type ConversationStatus,
  type ChannelType,
  type User,
  type Label,
  type Team,
  type Conversation,
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

interface ShellData {
  user: User;
  labels: Label[];
  counts: { mine: number; unassigned: number; all: number };
}

interface ShellContextValue extends ShellState {
  currentUser: User;
  setShellData: (data: Partial<ShellData>) => void;
  filterConversations: (conversations: Conversation[]) => Conversation[];
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

function countConversations(
  conversations: Conversation[],
  currentUser: User,
): { mine: number; unassigned: number; all: number } {
  return {
    mine: conversations.filter((conversation) => conversation.assignee?.id === currentUser.id).length,
    unassigned: conversations.filter((conversation) => conversation.assignee === null).length,
    all: conversations.length,
  };
}

export function getShellCounts(conversations: Conversation[], currentUser: User) {
  return countConversations(conversations, currentUser);
}

export function useShellInbox() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShellInbox must be used within ShellProvider');
  }
  return context;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShellState>({
    view: 'all',
    statusFilter: null,
    channelFilter: null,
    labelFilter: null,
    searchQuery: '',
  });
  const [shellData, setShellDataState] = useState<ShellData>({
    user: mockUser,
    labels: [],
    counts: { mine: 0, unassigned: 0, all: 0 },
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

  const setShellData = useCallback((data: Partial<ShellData>) => {
    setShellDataState((current) => ({ ...current, ...data }));
  }, []);

  const filterConversations = useCallback(
    (conversations: Conversation[]) => {
      const query = state.searchQuery.trim().toLowerCase();

      return conversations.filter((conversation) => {
        if (state.view === 'mine' && conversation.assignee?.id !== shellData.user.id) return false;
        if (state.view === 'unassigned' && conversation.assignee !== null) return false;
        if (state.statusFilter && conversation.status !== state.statusFilter) return false;
        if (state.channelFilter && conversation.channelOrigin !== state.channelFilter) return false;
        if (
          state.labelFilter &&
          !(conversation.labels ?? []).some((label) => label.id === state.labelFilter)
        ) {
          return false;
        }

        if (!query) return true;

        const fields = [
          String(conversation.displayId),
          conversation.subject,
          conversation.contact?.name,
          conversation.contact?.email,
          conversation.lastMessage?.body,
          ...(conversation.labels ?? []).map((label) => label.name),
        ];

        return fields.some((field) => field?.toLowerCase().includes(query));
      });
    },
    [shellData.user.id, state],
  );

  const contextValue = useMemo<ShellContextValue>(
    () => ({
      ...state,
      currentUser: shellData.user,
      setShellData,
      filterConversations,
    }),
    [filterConversations, setShellData, shellData.user, state],
  );

  return (
    <ShellContext.Provider value={contextValue}>
      <AppLayout
        user={shellData.user}
        labels={shellData.labels.length > 0 ? shellData.labels : mockLabels}
        teams={mockTeams}
        counts={shellData.counts}
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
    </ShellContext.Provider>
  );
}
