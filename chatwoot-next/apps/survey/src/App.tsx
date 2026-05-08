import { signal } from '@preact/signals';
import type { SurveyConfig } from './index';
import { createSurveyApi } from './api';

interface AppProps {
  config: SurveyConfig;
}

const rating = signal(0);
const comment = signal('');
const submitted = signal(false);

export function App({ config }: AppProps) {
  const api = createSurveyApi(config);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    await api.submit({ rating: rating.value, comment: comment.value });
    submitted.value = true;
  };

  if (submitted.value) {
    return <div class="p-4 text-center">Thanks for your feedback.</div>;
  }

  return (
    <form class="p-4 space-y-3" onSubmit={onSubmit}>
      <div class="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            class={`w-8 h-8 rounded ${n <= rating.value ? 'bg-yellow-400' : 'bg-gray-200'}`}
            onClick={() => (rating.value = n)}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        class="w-full border rounded p-2"
        placeholder="Comments"
        value={comment.value}
        onInput={(e) => (comment.value = (e.target as HTMLTextAreaElement).value)}
      />
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">
        Submit
      </button>
    </form>
  );
}
