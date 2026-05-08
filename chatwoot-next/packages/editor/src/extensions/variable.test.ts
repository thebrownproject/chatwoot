import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { variableExtension } from './variable';

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      variableExtension({
        items: ({ query }) =>
          [
            { key: 'contact.name' },
            { key: 'contact.email' },
            { key: 'agent.name' },
          ].filter(v => v.key.includes(query)),
      }),
    ],
    content: '',
  });
}

describe('variableExtension', () => {
  it('inserts a variable node atomically with the right attrs', () => {
    const editor = makeEditor();

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'variable',
        attrs: { key: 'contact.name' },
      })
      .run();

    const json = editor.getJSON();
    const para = (json.content ?? [])[0];
    const node = (para?.content ?? [])[0];

    expect(node?.type).toBe('variable');
    expect(node?.attrs?.['key']).toBe('contact.name');
    editor.destroy();
  });

  it('renderText returns plain {{key}} text', () => {
    const editor = makeEditor();
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'variable',
        attrs: { key: 'contact.name' },
      })
      .run();

    expect(editor.getText()).toBe('{{contact.name}}');
    editor.destroy();
  });

  it('renders HTML with data-variable attribute', () => {
    const editor = makeEditor();
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'variable',
        attrs: { key: 'agent.name' },
      })
      .run();

    const html = editor.getHTML();
    expect(html).toContain('data-variable="{{agent.name}}"');
    expect(html).toContain('{{agent.name}}');
    editor.destroy();
  });

  it('parses variable HTML back to a node with the key attribute', () => {
    const editor = makeEditor();
    editor.commands.setContent(
      '<p><span data-variable="{{contact.email}}">{{contact.email}}</span></p>'
    );

    const json = editor.getJSON();
    const node = ((json.content ?? [])[0]?.content ?? [])[0];
    expect(node?.type).toBe('variable');
    expect(node?.attrs?.['key']).toBe('contact.email');
    editor.destroy();
  });
});
