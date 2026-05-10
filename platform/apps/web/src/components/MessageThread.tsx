'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@buildpass/shell';
import { MessageBubble } from './MessageBubble';

interface MessageThreadProps {
  messages: Message[];
  currentUserId?: string | undefined;
  isLoading?: boolean | undefined;
}

export function MessageThread({ messages, currentUserId, isLoading }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading messages" className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        No messages yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwnMessage={message.sender.id === currentUserId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
