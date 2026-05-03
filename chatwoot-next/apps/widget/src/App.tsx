import { signal } from '@preact/signals';
import type { WidgetConfig } from './index';

interface AppProps {
  config: WidgetConfig;
}

const isOpen = signal(false);

export function App(_props: AppProps) {
  return (
    <div class="fixed bottom-4 right-4 z-50">
      {isOpen.value ? (
        <div class="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col">
          <header class="flex items-center justify-between p-3 border-b">
            <span class="font-medium">Chat</span>
            <button type="button" onClick={() => (isOpen.value = false)}>
              ×
            </button>
          </header>
          <div class="flex-1 p-3 overflow-y-auto" />
        </div>
      ) : (
        <button
          type="button"
          class="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg"
          onClick={() => (isOpen.value = true)}
        >
          Chat
        </button>
      )}
    </div>
  );
}
