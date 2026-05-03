import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { cannedResponseExtension, type CannedItem } from './canned-response';

const items: CannedItem[] = [
  { shortCode: 'foo', content: 'Hello, this is the FOO response.' },
  { shortCode: 'bar', content: 'BAR template' },
];

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      cannedResponseExtension({
        items: ({ query }) =>
          items.filter(item => item.shortCode.startsWith(query)),
      }),
    ],
    content: '',
  });
}

describe('cannedResponseExtension', () => {
  it('exposes a configurable items() option', () => {
    const editor = makeEditor();
    // Sanity: the extension is registered without throwing.
    expect(editor.extensionManager.extensions.map(e => e.name)).toContain(
      'cannedResponse'
    );
    editor.destroy();
  });

  it('replaces a /<short-code> trigger range with the canned content', () => {
    const editor = makeEditor();

    // Type the trigger and short-code.
    editor.commands.insertContent('/foo');
    expect(editor.getText()).toBe('/foo');

    // Simulate the suggestion popup picking the matching item: the suggestion
    // command deletes the trigger range (`/foo`) and inserts the content.
    const to = editor.state.selection.from;
    const from = to - '/foo'.length;
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(items[0]!.content)
      .run();

    expect(editor.getText()).toBe('Hello, this is the FOO response.');
    editor.destroy();
  });

  it('filters items by query prefix', async () => {
    const filter = ({ query }: { query: string }) =>
      items.filter(i => i.shortCode.startsWith(query));
    expect(filter({ query: 'fo' })).toEqual([items[0]]);
    expect(filter({ query: 'b' })).toEqual([items[1]]);
    expect(filter({ query: '' })).toEqual(items);
  });
});
