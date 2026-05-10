import type { Conversation, Message, User, Label, Team } from '@buildpass/shell';

const BASE_URL = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((options?.body != null) ? { 'Content-Type': 'application/json' } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Network error — unable to reach the API server');
  }

  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  conversations: {
    list(params?: {
      status?: string;
      assigneeId?: string;
      channelOrigin?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    }) {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
      if (params?.channelOrigin) searchParams.set('channelOrigin', params.channelOrigin);
      if (params?.priority) searchParams.set('priority', params.priority);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      const qs = searchParams.toString();
      return request<{ data: { data: Conversation[]; total: number } }>(
        `/conversations${qs ? `?${qs}` : ''}`,
      );
    },

    get(id: string) {
      return request<Conversation>(`/conversations/${id}`);
    },

    update(id: string, data: Partial<Pick<Conversation, 'status' | 'priority' | 'subject'>>) {
      return request<Conversation>(`/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    assign(id: string, assigneeId: string | null) {
      if (assigneeId === null) {
        return request<{ ok: true }>(`/conversations/${id}/unassign`, {
          method: 'POST',
        });
      }
      return request<{ ok: true }>(`/conversations/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assigneeId }),
      });
    },

    addLabel(id: string, labelId: string) {
      return request<unknown>(`/conversations/${id}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labelId }),
      });
    },

    removeLabel(id: string, labelId: string) {
      return request<unknown>(`/conversations/${id}/labels/${labelId}`, {
        method: 'DELETE',
      });
    },
  },

  messages: {
    list(conversationId: string) {
      return request<{ data: Message[] }>(`/conversations/${conversationId}/messages`);
    },

    create(conversationId: string, data: { body: string; visibility: 'public' | 'internal' }) {
      return request<{ data: Message }>(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  users: {
    me() {
      return request<User>('/users/me');
    },

    agents() {
      return request<{ data: User[] }>('/users/agents');
    },
  },

  labels: {
    list() {
      return request<{ data: Label[] }>('/labels');
    },
  },

  teams: {
    list() {
      return request<{ data: Team[] }>('/teams');
    },
  },
};
