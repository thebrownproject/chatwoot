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
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

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
      channel?: string;
      labelId?: string;
      search?: string;
      page?: number;
    }) {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.assigneeId) searchParams.set('assignee_id', params.assigneeId);
      if (params?.channel) searchParams.set('channel', params.channel);
      if (params?.labelId) searchParams.set('label_id', params.labelId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      const qs = searchParams.toString();
      return request<{ data: Conversation[]; meta: { total: number; page: number } }>(
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
      return request<Conversation>(`/conversations/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
    },

    addLabel(id: string, labelId: string) {
      return request<void>(`/conversations/${id}/labels`, {
        method: 'POST',
        body: JSON.stringify({ label_id: labelId }),
      });
    },

    removeLabel(id: string, labelId: string) {
      return request<void>(`/conversations/${id}/labels/${labelId}`, {
        method: 'DELETE',
      });
    },
  },

  messages: {
    list(conversationId: string) {
      return request<{ data: Message[] }>(`/conversations/${conversationId}/messages`);
    },

    create(conversationId: string, data: { body: string; visibility: 'public' | 'internal' }) {
      return request<Message>(`/conversations/${conversationId}/messages`, {
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
