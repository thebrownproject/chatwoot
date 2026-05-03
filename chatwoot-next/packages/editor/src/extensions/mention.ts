// Source: shared/editor mention plugin from `@chatwoot/prosemirror-schema`,
// used by private-note `@`-mentions in WootWriter/Editor.vue.
import { Node } from '@tiptap/core';

export const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,
  // TODO: port `@` agent mentions, suggestion list, and rendering rules.
});
