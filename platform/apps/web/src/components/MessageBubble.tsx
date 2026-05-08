import { Bot, Lock, Activity } from 'lucide-react';
import type { Message } from '@buildpass/shell';
import { initials, formatTime } from '@buildpass/shell';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage?: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const isInternal = message.visibility === 'internal';
  const isActivity = message.type === 'activity';
  const isAgent = message.sender.type === 'ai_agent';

  if (isActivity) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Activity className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-400">{message.body}</span>
        <span className="text-xs text-slate-300">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 py-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          isAgent
            ? 'bg-purple-100 text-purple-700'
            : isOwnMessage
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-200 text-slate-600'
        }`}
      >
        {isAgent ? (
          <Bot className="h-4 w-4" />
        ) : (
          initials(message.sender.name)
        )}
      </div>

      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">
            {message.sender.name}
          </span>
          {isAgent && (
            <span className="rounded bg-purple-50 px-1 py-0.5 text-[10px] font-medium text-purple-600">
              AI
            </span>
          )}
          {isInternal && (
            <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-600">
              <Lock className="h-2.5 w-2.5" />
              Internal
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            {formatTime(message.createdAt)}
          </span>
        </div>

        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isInternal
              ? 'border border-amber-200 bg-amber-50 text-slate-800'
              : isOwnMessage
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-800'
          }`}
        >
          {message.bodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
          ) : (
            <p className="whitespace-pre-wrap">{message.body}</p>
          )}
        </div>

        {message.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((attachment, i) => (
              <a
                key={i}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-blue-600 hover:bg-slate-50"
              >
                {attachment.filename}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
