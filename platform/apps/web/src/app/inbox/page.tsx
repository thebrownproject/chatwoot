'use client';

import { MessageSquare } from 'lucide-react';
import { ConversationList } from '@/components/ConversationList';
import { mockConversations } from '@/lib/mock-data';

export default function InboxPage() {
  return (
    <div className="flex h-full w-full">
      <div className="flex w-96 flex-col border-r border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {mockConversations.length}
          </span>
        </div>
        <ConversationList conversations={mockConversations} />
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
