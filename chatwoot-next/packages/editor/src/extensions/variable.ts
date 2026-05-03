// Source: app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
// (variable picker triggered by `{{`, inserts a non-editable atom that
// serializes back to plain `{{key}}` text on send).
import { Node, mergeAttributes, type Range } from '@tiptap/core';
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion';

export interface VariableItem {
  key: string;
  label?: string;
}

export interface VariableOptions {
  items: (query: { query: string }) => VariableItem[] | Promise<VariableItem[]>;
  render?: SuggestionOptions<VariableItem>['render'];
}

export const Variable = Node.create<VariableOptions>({
  name: 'variable',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      items: () => [],
    };
  },

  addAttributes() {
    return {
      key: {
        default: '',
        parseHTML: element => {
          const raw =
            element.getAttribute('data-variable') ?? element.textContent ?? '';
          return raw.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '');
        },
        renderHTML: attrs => {
          if (!attrs['key']) return {};
          return { 'data-variable': `{{${attrs['key']}}}` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const key = node.attrs['key'] as string;
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-variable': `{{${key}}}` }),
      `{{${key}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs['key']}}}`;
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<VariableItem>({
        editor: this.editor,
        char: '{{',
        allowSpaces: false,
        startOfLine: false,
        items: this.options.items,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: typeof this.editor;
          range: Range;
          props: VariableItem;
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: 'variable', attrs: { key: props.key } },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
        ...(this.options.render ? { render: this.options.render } : {}),
      }),
    ];
  },
});

/**
 * Factory for the variable suggestion node.
 *
 * @example
 *   variableExtension({
 *     items: ({ query }) =>
 *       AVAILABLE_VARIABLES.filter(v => v.key.startsWith(query)),
 *   });
 */
export function variableExtension(options: VariableOptions) {
  return Variable.configure(options);
}

export type { SuggestionProps };
