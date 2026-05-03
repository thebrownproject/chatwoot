// Thin fetch wrapper around apps/api-public `/widget/[token]/*` endpoints.

export interface WidgetApiOptions {
  baseUrl: string;
  websiteToken: string;
}

export function createWidgetApi({ baseUrl, websiteToken }: WidgetApiOptions) {
  const root = `${baseUrl.replace(/\/$/, '')}/widget/${websiteToken}`;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${root}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`Widget API ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    fetchConversation: () => request('/conversation'),
    sendMessage: (content: string) =>
      request('/messages', { method: 'POST', body: JSON.stringify({ content }) }),
  };
}
