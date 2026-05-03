import { describe, expect, it } from 'vitest';

import { parse, serialize } from './serialization';

describe('serialization', () => {
  it('serializes a simple paragraph to HTML', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hello world' }],
        },
      ],
    };
    expect(serialize(json)).toBe('<p>hello world</p>');
  });

  it('parses HTML back to a ProseMirror document', () => {
    const json = parse('<p>hello world</p>');
    expect(json['type']).toBe('doc');
    const para = (json['content'] ?? [])[0];
    expect(para.type).toBe('paragraph');
    expect(para.content[0]).toMatchObject({ type: 'text', text: 'hello world' });
  });

  it('round-trips JSON -> HTML -> JSON for a multi-block document', () => {
    const original = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a ' },
            {
              type: 'text',
              text: 'bold',
              marks: [{ type: 'bold' }],
            },
            { type: 'text', text: ' word' },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'second paragraph' }],
        },
      ],
    };

    const html = serialize(original);
    const reparsed = parse(html);

    // Ignore whitespace-only differences by serializing again and comparing.
    expect(serialize(reparsed)).toBe(html);
    expect(reparsed['type']).toBe('doc');
    expect((reparsed['content'] ?? []).length).toBe(2);
  });

  it('round-trips a variable node preserving its key', () => {
    const original = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'variable', attrs: { key: 'contact.name' } },
          ],
        },
      ],
    };

    const html = serialize(original);
    expect(html).toContain('data-variable="{{contact.name}}"');

    const reparsed = parse(html);
    const para = (reparsed['content'] ?? [])[0];
    const variableNode = para.content.find(
      (n: { type: string }) => n.type === 'variable'
    );
    expect(variableNode?.attrs?.key).toBe('contact.name');
  });
});
