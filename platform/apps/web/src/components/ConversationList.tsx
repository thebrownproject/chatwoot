'use client';

import { Inbox } from 'lucide-react';
import type { Conversation } from '@buildpass/shell';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  activeId,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="mt-2 text-sm">Loading...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center text-slate-400">
        <Inbox className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-500">No conversations</p>
        <p className="mt-1 text-xs text-slate-400">
          New conversations will appear here when they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeId}
        />
      ))}
    </div>
  );
}
