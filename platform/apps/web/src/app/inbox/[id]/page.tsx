'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import type { Conversation, ConversationStatus, Label, Message, User } from '@buildpass/shell';
import { ConversationList } from '@/components/ConversationList';
import { MessageThread } from '@/components/MessageThread';
import { ReplyComposer } from '@/components/ReplyComposer';
import { ConversationDetails } from '@/components/ConversationDetails';
import { getShellCounts, useShellInbox } from '../../shell-provider';
import {
  addConversationLabel,
  assignConversation,
  changeConversationStatus,
  loadConversationData,
  removeConversationLabel,
  sendMessage,
} from '@/lib/inbox-api';

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { filterConversations, setShellData } = useShellInbox();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleConversations = useMemo(
    () => filterConversations(conversations),
    [conversations, filterConversations],
  );

  const refresh = useCallback(async () => {
    const data = await loadConversationData(id);
    setConversations(data.conversations);
    setConversation(data.conversation);
    setMessages(data.messages);
    setAgents(data.agents);
    setLabels(data.labels);
    setCurrentUser(data.currentUser);
    setShellData({
      ...(data.currentUser ? { user: data.currentUser } : {}),
      labels: data.labels,
      ...(data.currentUser
        ? { counts: getShellCounts(data.conversations, data.currentUser) }
        : {}),
    });
    setError(null);
  }, [id, setShellData]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    loadConversationData(id)
      .then((data) => {
        if (cancelled) return;
        setConversations(data.conversations);
        setConversation(data.conversation);
        setMessages(data.messages);
        setAgents(data.agents);
        setLabels(data.labels);
        setCurrentUser(data.currentUser);
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
        setError(err instanceof Error ? err.message : 'Unable to load conversation');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, setShellData]);

  const handleSend = useCallback(
    async (body: string, visibility: 'public' | 'internal') => {
      if (!currentUser) return;
      setIsSaving(true);
      try {
        const message = await sendMessage(id, currentUser.id, body, visibility);
        setMessages((prev) => [...prev, message]);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to send message');
      } finally {
        setIsSaving(false);
      }
    },
    [currentUser, id, refresh],
  );

  const handleAssign = useCallback(
    async (userId: string | null) => {
      if (!currentUser) return;
      setIsSaving(true);
      try {
        await assignConversation(id, userId, currentUser.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update assignment');
      } finally {
        setIsSaving(false);
      }
    },
    [currentUser, id, refresh],
  );

  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!currentUser) return;
      setIsSaving(true);
      try {
        await changeConversationStatus(id, status, currentUser.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update status');
      } finally {
        setIsSaving(false);
      }
    },
    [currentUser, id, refresh],
  );

  const handleAddLabel = useCallback(
    async (labelId: string) => {
      setIsSaving(true);
      try {
        await addConversationLabel(id, labelId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to add label');
      } finally {
        setIsSaving(false);
      }
    },
    [id, refresh],
  );

  const handleRemoveLabel = useCallback(
    async (labelId: string) => {
      setIsSaving(true);
      try {
        await removeConversationLabel(id, labelId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to remove label');
      } finally {
        setIsSaving(false);
      }
    },
    [id, refresh],
  );

  return (
    <div className="flex h-full w-full">
      <div className="flex w-96 flex-col border-r border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {visibleConversations.length}
          </span>
        </div>
        <ConversationList conversations={visibleConversations} activeId={id} isLoading={isLoading} />
      </div>

      {conversation ? (
        <>
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {conversation.subject ?? `Conversation #${conversation.displayId}`}
              </h2>
              <span className="text-xs text-slate-400">#{conversation.displayId}</span>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>

            <MessageThread
              messages={messages}
              currentUserId={currentUser?.id}
              isLoading={isLoading}
            />
            <ReplyComposer onSend={handleSend} disabled={isSaving || !currentUser} />
          </div>

          <ConversationDetails
            conversation={conversation}
            agents={agents}
            availableLabels={labels}
            onAssign={handleAssign}
            onStatusChange={handleStatusChange}
            onAddLabel={handleAddLabel}
            onRemoveLabel={handleRemoveLabel}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-500">
          {isLoading ? 'Loading conversation...' : 'Conversation not found'}
        </div>
      )}
    </div>
  );
}
