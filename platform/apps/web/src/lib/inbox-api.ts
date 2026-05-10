import type {
  Conversation,
  ConversationPriority,
  ConversationStatus,
  Label,
  Message,
  MessageVisibility,
  User,
  UserType,
} from '@buildpass/shell';

const BASE_URL = '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiUser = {
  id: string;
  type: UserType;
  name: string;
  email: string | null;
  avatarUrl?: string | null;
};

type ApiLabel = {
  id: string;
  name: string;
  color: string | null;
};

type ApiConversation = {
  id: string;
  displayId: number;
  status: ConversationStatus;
  channelOrigin: Conversation['channelOrigin'];
  assigneeId: string | null;
  subject: string | null;
  priority: ConversationPriority;
  snoozedUntil: string | null;
  firstReplyAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: Message['type'];
  visibility: MessageVisibility;
  body: string;
  bodyHtml: string | null;
  metadata: Record<string, unknown> | null;
  attachments: Message['attachments'] | null;
  createdAt: string;
  updatedAt: string;
};

type ApiParticipant = {
  userId: string;
  role: 'contact' | 'assignee' | 'observer' | 'copilot';
  user: ApiUser;
};

type InboxData = {
  conversations: Conversation[];
  labels: Label[];
  agents: User[];
  currentUser: User | undefined;
};

type ConversationData = InboxData & {
  conversation: Conversation | undefined;
  messages: Message[];
};

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
    throw new ApiError(0, 'Unable to reach the API server');
  }

  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

function mapUser(user: ApiUser): User {
  return {
    id: user.id,
    type: user.type,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

function fallbackUser(id: string): User {
  return {
    id,
    type: 'system',
    name: 'Unknown',
    email: null,
    avatarUrl: null,
  };
}

function mapMessage(message: ApiMessage, usersById: Map<string, User>): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: usersById.get(message.senderId) ?? fallbackUser(message.senderId),
    type: message.type,
    visibility: message.visibility,
    body: message.body,
    bodyHtml: message.bodyHtml,
    metadata: message.metadata ?? {},
    attachments: message.attachments ?? [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function listUsers(): Promise<User[]> {
  const response = await request<{ data: ApiUser[] }>('/users');
  return response.data.map(mapUser);
}

async function listLabels(): Promise<Label[]> {
  const response = await request<{ data: ApiLabel[] }>('/labels');
  return response.data;
}

async function listRawConversations(): Promise<ApiConversation[]> {
  const response = await request<{ data: { data: ApiConversation[]; total: number } }>(
    '/conversations',
  );
  return response.data.data;
}

async function getRawConversation(id: string): Promise<ApiConversation> {
  const response = await request<{ data: ApiConversation }>(`/conversations/${id}`);
  return response.data;
}

async function listConversationLabels(conversationId: string): Promise<Label[]> {
  const response = await request<{ data: ApiLabel[] }>(`/conversations/${conversationId}/labels`);
  return response.data;
}

async function listParticipants(conversationId: string): Promise<ApiParticipant[]> {
  const response = await request<{ data: ApiParticipant[] }>(
    `/conversations/${conversationId}/participants`,
  );
  return response.data;
}

async function listMessages(conversationId: string, usersById: Map<string, User>): Promise<Message[]> {
  const response = await request<{ data: ApiMessage[] }>(`/conversations/${conversationId}/messages`);
  return response.data.map((message) => mapMessage(message, usersById)).reverse();
}

async function hydrateConversation(
  raw: ApiConversation,
  usersById: Map<string, User>,
): Promise<{ conversation: Conversation; messages: Message[] }> {
  const [labels, participants, messages] = await Promise.all([
    listConversationLabels(raw.id),
    listParticipants(raw.id),
    listMessages(raw.id, usersById),
  ]);

  const contactParticipant = participants.find((participant) => participant.role === 'contact');
  const contact = contactParticipant ? mapUser(contactParticipant.user) : undefined;
  const assignee = raw.assigneeId ? (usersById.get(raw.assigneeId) ?? null) : null;

  return {
    conversation: {
      ...raw,
      assignee,
      labels,
      contact,
      lastMessage: messages.at(-1),
      unreadCount: 0,
    },
    messages,
  };
}

async function loadBaseData(): Promise<{
  labels: Label[];
  users: User[];
  usersById: Map<string, User>;
  agents: User[];
  currentUser: User | undefined;
}> {
  const [users, labels] = await Promise.all([listUsers(), listLabels()]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const agents = users.filter((user) => user.type === 'human_agent' || user.type === 'ai_agent');
  return {
    labels,
    users,
    usersById,
    agents,
    currentUser: agents[0],
  };
}

export async function loadInboxData(): Promise<InboxData> {
  const [{ labels, usersById, agents, currentUser }, rawConversations] = await Promise.all([
    loadBaseData(),
    listRawConversations(),
  ]);
  const hydrated = await Promise.all(
    rawConversations.map((conversation) => hydrateConversation(conversation, usersById)),
  );
  return {
    conversations: hydrated.map((item) => item.conversation),
    labels,
    agents,
    currentUser,
  };
}

export async function loadConversationData(id: string): Promise<ConversationData> {
  const { labels, usersById, agents, currentUser } = await loadBaseData();
  const [rawConversations, rawConversation] = await Promise.all([
    listRawConversations(),
    getRawConversation(id).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return undefined;
      throw error;
    }),
  ]);

  if (!rawConversation) {
    const conversations = await Promise.all(
      rawConversations.map((conversation) => hydrateConversation(conversation, usersById)),
    );
    return {
      conversations: conversations.map((item) => item.conversation),
      labels,
      agents,
      currentUser,
      conversation: undefined,
      messages: [],
    };
  }

  const [listHydrated, detailHydrated] = await Promise.all([
    Promise.all(rawConversations.map((conversation) => hydrateConversation(conversation, usersById))),
    hydrateConversation(rawConversation, usersById),
  ]);

  return {
    conversations: listHydrated.map((item) => item.conversation),
    labels,
    agents,
    currentUser,
    conversation: detailHydrated.conversation,
    messages: detailHydrated.messages,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  visibility: MessageVisibility,
): Promise<Message> {
  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  // Actor identity is derived from the authenticated session on the server.
  // senderId is passed in the request body for message attribution.
  const response = await request<{ data: ApiMessage }>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, visibility, senderId }),
  });
  return mapMessage(response.data, usersById);
}

export async function assignConversation(
  conversationId: string,
  assigneeId: string | null,
  actorId: string,
): Promise<void> {
  // Actor identity is derived from the authenticated session on the server.
  await request(`/conversations/${conversationId}/${assigneeId ? 'assign' : 'unassign'}`, {
    method: 'POST',
    body: assigneeId ? JSON.stringify({ assigneeId }) : undefined,
  });
}

export async function changeConversationStatus(
  conversationId: string,
  status: ConversationStatus,
  actorId: string,
): Promise<void> {
  if (status === 'resolved' || status === 'open') {
    // Actor identity is derived from the authenticated session on the server.
    await request(`/conversations/${conversationId}/${status === 'resolved' ? 'resolve' : 'reopen'}`, {
      method: 'POST',
    });
    return;
  }

  if (status === 'snoozed') {
    // Actor identity is derived from the authenticated session on the server.
    await request(`/conversations/${conversationId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }),
    });
    return;
  }

  if (status === 'pending') {
    // Actor identity is derived from the authenticated session on the server.
    await request(`/conversations/${conversationId}/pending`, {
      method: 'POST',
    });
  }
}

export async function addConversationLabel(conversationId: string, labelId: string): Promise<void> {
  await request(`/conversations/${conversationId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labelId }),
  });
}

export async function removeConversationLabel(conversationId: string, labelId: string): Promise<void> {
  await request(`/conversations/${conversationId}/labels/${labelId}`, {
    method: 'DELETE',
  });
}
