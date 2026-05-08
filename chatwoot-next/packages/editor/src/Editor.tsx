// Source: app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
import type { FC } from 'react';
import type { Extensions } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { Mention } from './extensions/mention';
import { cannedResponseExtension } from './extensions/canned-response';
import { variableExtension } from './extensions/variable';

export type EditorProps = {
  /** HTML content (or empty string). */
  value: string;
  /** Called with the latest HTML on every transaction. */
  onChange: (html: string) => void;
  placeholder?: string;
  /** Additional extensions, merged after the defaults. */
  extensions?: Extensions;
  className?: string;
};

/**
 * The default extension list used by both `Editor` and `serialize`/`parse` so
 * that round-trips stay byte-compatible.
 */
export const defaultExtensions: Extensions = [
  StarterKit,
  Mention.configure({
    HTMLAttributes: { class: 'mention' },
  }),
  cannedResponseExtension({ items: () => [] }),
  variableExtension({ items: () => [] }),
];

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export const Editor: FC<EditorProps> = ({
  value,
  onChange,
  extensions = [],
  className,
}) => {
  const editor = useEditor({
    extensions: [...defaultExtensions, ...extensions],
    content: value,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  return (
    <EditorContent
      editor={editor}
      className={cn('prose prose-sm max-w-none focus:outline-none', className)}
    />
  );
};
