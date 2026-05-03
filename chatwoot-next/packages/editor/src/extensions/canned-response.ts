// Source: app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
// (canned-response suggestion plugin: trigger `/`, search by short-code,
// inserts response content on selection).
import { Extension, type Range } from '@tiptap/core';
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion';

export interface CannedItem {
  shortCode: string;
  content: string;
}

export interface CannedResponseOptions {
  items: (query: { query: string }) => CannedItem[] | Promise<CannedItem[]>;
  render?: SuggestionOptions<CannedItem>['render'];
}

export const CannedResponse = Extension.create<CannedResponseOptions>({
  name: 'cannedResponse',

  addOptions() {
    return {
      items: () => [],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<CannedItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        // Allow letters, numbers, and underscore in the short-code query.
        allowedPrefixes: null,
        startOfLine: false,
        items: this.options.items,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: typeof this.editor;
          range: Range;
          props: CannedItem;
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(props.content)
            .run();
        },
        ...(this.options.render ? { render: this.options.render } : {}),
      }),
    ];
  },
});

/**
 * Factory for the canned-response suggestion extension.
 *
 * @example
 *   cannedResponseExtension({
 *     items: ({ query }) =>
 *       allCanned.filter(c => c.shortCode.startsWith(query)),
 *   });
 */
export function cannedResponseExtension(options: CannedResponseOptions) {
  return CannedResponse.configure(options);
}

export type { SuggestionProps };
