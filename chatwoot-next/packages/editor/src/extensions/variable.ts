// Source: shared/editor variable node from `@chatwoot/prosemirror-schema`,
// used in app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
import { Node } from '@tiptap/core';

export const Variable = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  // TODO: port `{{contact.name}}` style placeholders, including parsing of
  // double-curly braces and serialization back to plain text on save.
});
