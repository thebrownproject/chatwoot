// Source: shared/editor (prosemirror) canned response handling, used by
// app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
import { Node } from '@tiptap/core';

export const CannedResponse = Node.create({
  name: 'cannedResponse',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,
  // TODO: port `/` trigger, suggestion list, and insertion semantics from the
  // legacy `@chatwoot/prosemirror-schema` canned-response plugin.
});
