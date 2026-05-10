'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { Conversation } from '@buildpass/shell';
import { ConversationList } from '@/components/ConversationList';
import { loadInboxData } from '@/lib/inbox-api';
import { getShellCounts, useShellInbox } from '../shell-provider';

export default function InboxPage() {
  const { filterConversations, setShellData } = useShellInbox();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const visibleConversations = useMemo(
    () => filterConversations(conversations),
    [conversations, filterConversations],
  );

  useEffect(() => {
    let cancelled = false;

    setError(null);
    loadInboxData()
      .then((data) => {
        if (cancelled) return;
        setConversations(data.conversations);
        setShellData({
          ...(data.currentUser ? { user: data.currentUser } : {}),
          labels: data.labels,
          ...(data.currentUser
            ? { counts: getShellCounts(data.conversations, data.currentUser) }
            : {}),
        });
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load conversations');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setShellData]);

  return (
    <div className="flex h-full w-full">
      <div className="flex w-96 flex-col border-r border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {visibleConversations.length}
          </span>
        </div>
        {error ? (
          <div className="px-4 py-3 text-sm text-red-600">{error}</div>
        ) : (
          <ConversationList conversations={visibleConversations} isLoading={isLoading} />
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 text-slate-400">
        <MessageSquare className="h-12 w-12 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          Select a conversation
        </p>
        <p className="mt-1 text-xs">
          Choose a conversation from the list to view messages.
        </p>
      </div>
    </div>
  );
}
