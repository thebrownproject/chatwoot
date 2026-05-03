// Source: app/javascript/dashboard/components/widgets/WootWriter/CopilotEditor.vue
import { Extension } from '@tiptap/core';

export const Copilot = Extension.create({
  name: 'copilot',
  // TODO: port inline ghost-text suggestions, accept/reject keymap, and
  // streaming completion handling from `CopilotEditor.vue`.
});
