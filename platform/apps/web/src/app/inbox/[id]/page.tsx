'use client';

import { use, useState, useCallback } from 'react';
import { notFound } from 'next/navigation';
import type { ConversationStatus } from '@buildpass/shell';
import { ConversationList } from '@/components/ConversationList';
import { MessageThread } from '@/components/MessageThread';
import { ReplyComposer } from '@/components/ReplyComposer';
import { ConversationDetails } from '@/components/ConversationDetails';
import {
  mockConversations,
  mockMessages,
  mockAgents,
  mockLabels,
} from '@/lib/mock-data';

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const conversation = mockConversations.find((c) => c.id === id);
  const [messages, setMessages] = useState(mockMessages[id] ?? []);

  const handleSend = useCallback(
    (body: string, visibility: 'public' | 'internal') => {
      const newMessage = {
        id: `msg-new-${Date.now()}`,
        conversationId: id,
        sender: mockAgents[0]!,
        type: 'text' as const,
        visibility,
        body,
        bodyHtml: null,
        metadata: {},
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    [id],
  );

  const handleAssign = useCallback((_userId: string | null) => {
    // Will call api.conversations.assign()
  }, []);

  const handleStatusChange = useCallback((_status: ConversationStatus) => {
    // Will call api.conversations.update()
  }, []);

  const handleAddLabel = useCallback((_labelId: string) => {
    // Will call api.conversations.addLabel()
  }, []);

  const handleRemoveLabel = useCallback((_labelId: string) => {
    // Will call api.conversations.removeLabel()
  }, []);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex w-96 flex-col border-r border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {mockConversations.length}
          </span>
        </div>
        <ConversationList conversations={mockConversations} activeId={id} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {conversation.subject ?? `Conversation #${conversation.displayId}`}
          </h2>
          <span className="text-xs text-slate-400">#{conversation.displayId}</span>
        </div>

        <MessageThread messages={messages} currentUserId={mockAgents[0]?.id} />
        <ReplyComposer onSend={handleSend} />
      </div>

      <ConversationDetails
        conversation={conversation}
        agents={mockAgents}
        availableLabels={mockLabels}
        onAssign={handleAssign}
        onStatusChange={handleStatusChange}
        onAddLabel={handleAddLabel}
        onRemoveLabel={handleRemoveLabel}
      />
    </div>
  );
}
