import { Bot, Lock, Activity } from 'lucide-react';
import type { Message } from '@buildpass/shell';
import { initials, formatTime } from '@buildpass/shell';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'hr', 'sub', 'sup', 'del', 's',
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'class']);

function sanitizeHtml(html: string): string {
  // Strip all event handlers (on*=...) across all tag formats
  let cleaned = html.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Block dangerous URI schemes everywhere (href, src, action, etc.)
  cleaned = cleaned.replace(/(javascript|vbscript|data)\s*:/gi, 'blocked:');

  // Remove disallowed tags entirely (keep content for inline, strip content for dangerous)
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta', 'base', 'svg', 'math'];
  for (const tag of dangerousTags) {
    // Remove tags with content
    cleaned = cleaned.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    // Remove self-closing variants
    cleaned = cleaned.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '');
  }

  // Remove any remaining tags not in allowlist
  cleaned = cleaned.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi, (match, tagName: string) => {
    if (ALLOWED_TAGS.has(tagName.toLowerCase())) {
      // Strip disallowed attributes from allowed tags
      return match.replace(/\s+([a-z][a-z0-9-]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, (attrMatch, attrName: string) => {
        return ALLOWED_ATTRS.has(attrName.toLowerCase()) ? attrMatch : '';
      });
    }
    return '';
  });

  // Force safe link targets
  cleaned = cleaned.replace(/<a\b/gi, '<a rel="noopener noreferrer" target="_blank"');

  return cleaned;
}

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
      <div role="status" className="flex items-center justify-center gap-2 py-2">
        <Activity aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
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
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.bodyHtml) }} />
          ) : (
            <p className="whitespace-pre-wrap">{message.body}</p>
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.url}
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
