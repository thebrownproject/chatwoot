'use client';

import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Lock } from 'lucide-react';

interface ReplyComposerProps {
  onSend: (body: string, visibility: 'public' | 'internal') => void;
  disabled?: boolean;
}

export function ReplyComposer({ onSend, disabled }: ReplyComposerProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const MAX_LENGTH = 10_000;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > MAX_LENGTH) return;
      onSend(trimmed, isInternal ? 'internal' : 'public');
      setBody('');
    },
    [body, isInternal, onSend],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-t px-4 py-3 ${
        isInternal ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsInternal(false)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            !isInternal
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Reply
        </button>
        <button
          type="button"
          onClick={() => setIsInternal(true)}
          className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            isInternal
              ? 'bg-amber-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Lock className="h-3 w-3" />
          Internal Note
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          aria-label={isInternal ? 'Write an internal note' : 'Type your reply'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isInternal
              ? 'Write an internal note... (not visible to customer)'
              : 'Type your reply...'
          }
          disabled={disabled}
          maxLength={MAX_LENGTH}
          rows={3}
          className={`flex-1 resize-none rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
            isInternal
              ? 'border-amber-300 bg-white focus:border-amber-500 focus:ring-amber-500'
              : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-500'
          }`}
        />
        <button
          type="submit"
          aria-label={isInternal ? 'Send internal note' : 'Send reply'}
          disabled={disabled || !body.trim() || body.trim().length > MAX_LENGTH}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isInternal
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {isInternal && (
        <p className="mt-1.5 text-[11px] text-amber-600">
          This note is only visible to your team members.
        </p>
      )}
    </form>
  );
}
