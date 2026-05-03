// Serialization helpers bridging Tiptap JSON <-> the HTML/markdown stored in
// `messages.content` by Rails. Output MUST stay byte-compatible with what the
// Rails backend reads/writes today; verify against a fixture-based test before
// rolling out.
//
// TODO: port the serializer/parser from `@chatwoot/prosemirror-schema` and add
// a fixture spec that diffs round-tripped content against existing
// `messages.content` samples.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TiptapJSON = Record<string, any>;

export function serialize(_json: TiptapJSON): string {
  // TODO: implement; must match Rails-stored `messages.content` byte-for-byte.
  return '';
}

export function parse(_html: string): TiptapJSON {
  // TODO: implement; must round-trip with `serialize` for all existing
  // message fixtures.
  return { type: 'doc', content: [] };
}
