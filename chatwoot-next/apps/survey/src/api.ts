// Posts to apps/api-public `/survey/[token]/responses`.

export interface SurveyApiOptions {
  baseUrl: string;
  surveyToken: string;
}

export interface SurveyResponsePayload {
  rating: number;
  comment: string;
}

export function createSurveyApi({ baseUrl, surveyToken }: SurveyApiOptions) {
  const root = `${baseUrl.replace(/\/$/, '')}/survey/${surveyToken}`;

  return {
    async submit(payload: SurveyResponsePayload) {
      const res = await fetch(`${root}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Survey API ${res.status}`);
      return res.json();
    },
  };
}
