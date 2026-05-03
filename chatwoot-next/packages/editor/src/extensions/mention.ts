// Source: app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
// (`@`-mentions for agents in private notes). Thin wrapper over
// `@tiptap/extension-mention` with default styling. The suggestion popup is
// expected to be wired by the consumer (it requires a React render context).
import MentionExtension, {
  type MentionOptions as TiptapMentionOptions,
} from '@tiptap/extension-mention';

// Re-export the configured Mention extension. Consumers can call
// `Mention.configure({ suggestion })` to plug in their own popup renderer.
//
// TODO: ship a React `MentionList` popup component once we have a host app
// providing portal/positioning primitives. The OSS Vue editor uses the
// `@`-suggestion plugin in `WootWriter/Editor.vue` (see `showUserMentions`).
export const Mention = MentionExtension.configure({
  HTMLAttributes: {
    class: 'mention',
  },
});

export type MentionOptions = TiptapMentionOptions;
export { MentionExtension };
