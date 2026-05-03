// Source: app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
import type { FC } from 'react';
import type { Extension, Node, Mark } from '@tiptap/pm/model';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extensions?: Array<Extension | Node | Mark | any>;
}

export const Editor: FC<EditorProps> = ({ value, onChange, extensions = [] }) => {
  // TODO: port toolbar, mentions, canned responses, variables, audio recording,
  // copilot, and serialization parity with `WootWriter/Editor.vue`.
  const editor = useEditor({
    extensions: [StarterKit, ...extensions],
    content: value,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  return <EditorContent editor={editor} />;
};
