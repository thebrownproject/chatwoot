// Source: app/javascript/dashboard/components/widgets/WootWriter/Editor.vue
// (audio attachment recording flow).
import { Node } from '@tiptap/core';

export const AudioRecording = Node.create({
  name: 'audioRecording',
  group: 'block',
  atom: true,
  // TODO: port MediaRecorder integration, blob attachment, and inline preview
  // from the Vue `AudioRecorder` widget.
});
