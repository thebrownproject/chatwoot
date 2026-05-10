'use client';

import Link from 'next/link';
import type { Conversation } from '@buildpass/shell';
import { channelIcons, initials, timeAgo } from '@buildpass/shell';
import { StatusBadge } from './StatusBadge';

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
}

export function ConversationItem({ conversation, isActive }: ConversationItemProps) {
  const ChannelIcon = channelIcons[conversation.channelOrigin];
  const contactName = conversation.contact?.name ?? 'Unknown';
  const preview = conversation.lastMessage?.body ?? '';
  const truncatedPreview = preview.length > 80 ? `${preview.slice(0, 80)}...` : preview;

  return (
    <Link
      href={`/inbox/${conversation.id}`}
      aria-label={`Conversation #${conversation.displayId} with ${contactName}${conversation.subject ? `: ${conversation.subject}` : ''}`}
      aria-current={isActive ? 'page' : undefined}
      className={`block border-b border-slate-100 px-4 py-3 transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
            {initials(contactName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {contactName}
              </span>
              <span className="text-xs text-slate-400">#{conversation.displayId}</span>
              {ChannelIcon && <ChannelIcon aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />}
            </div>
            {conversation.subject && (
              <p className="mt-0.5 truncate text-sm font-medium text-slate-700">
                {conversation.subject}
              </p>
            )}
            <p className="mt-0.5 truncate text-sm text-slate-500">{truncatedPreview}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-slate-400">
            {timeAgo(conversation.updatedAt)}
          </span>
          <StatusBadge status={conversation.status} />
          {(conversation.unreadCount ?? 0) > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
      {conversation.labels && conversation.labels.length > 0 && (
        <div className="mt-1.5 flex gap-1 pl-12">
          {conversation.labels.map((label) => (
            <span
              key={label.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
              style={{
                backgroundColor: label.color ? `${label.color}20` : '#e2e8f0',
                color: label.color ?? '#475569',
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
