// Serialization helpers bridging Tiptap JSON <-> the HTML stored in
// `messages.content` by Rails. Output should stay byte-compatible with what
// the Rails backend reads/writes today.
//
// TODO: confirm output matches Rails-stored `messages.content` byte-for-byte
// against existing fixtures once we have a fixtures directory available.
import { generateHTML, generateJSON } from '@tiptap/html';

import { defaultExtensions } from './Editor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TiptapJSON = Record<string, any>;

export function serialize(json: TiptapJSON): string {
  return generateHTML(json, defaultExtensions);
}

export function parse(html: string): TiptapJSON {
  return generateJSON(html, defaultExtensions) as TiptapJSON;
}

export { defaultExtensions };
