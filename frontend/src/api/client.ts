import type { Agent, Template, DashboardStats, CreateAgentPayload, ChatMessage, Project, ProjectMessage, CreateProjectPayload, ProjectTask, CreateTaskPayload, UpdateTaskPayload, CharacterListItem } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as unknown as T);
}

async function requestWithSession<T>(path: string, sessionId: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId, ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as unknown as T);
}

async function requestText(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.text();
}

export const api = {
  // Dashboard
  getStats: () => request<DashboardStats>('/dashboard/stats'),

  // Agents
  getAgents: (type?: string) => request<Agent[]>(`/agents${type ? `?type=${type}` : ''}`),
  getAgent: (id: string) => request<Agent>(`/agents/${id}`),
  createAgent: (data: CreateAgentPayload) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Partial<CreateAgentPayload>) =>
    request<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgent: (id: string) =>
    request<void>(`/agents/${id}`, { method: 'DELETE' }),
  startAgent: (id: string) =>
    request<Agent>(`/agents/${id}/start`, { method: 'POST' }),
  stopAgent: (id: string) =>
    request<Agent>(`/agents/${id}/stop`, { method: 'POST' }),
  restartAgent: (id: string) =>
    request<Agent>(`/agents/${id}/restart`, { method: 'POST' }),
  rebuildAgent: (id: string) =>
    request<Agent>(`/agents/${id}/rebuild`, { method: 'POST' }),
  getAgentLogs: (id: string, tail = 100) =>
    requestText(`/agents/${id}/logs?tail=${tail}`),
  getAgentStatus: (id: string) =>
    request<{ status: string }>(`/agents/${id}/status`),
  batchDeploy: (agents: CreateAgentPayload[]) =>
    request<Agent[]>('/agents/batch-deploy', { method: 'POST', body: JSON.stringify(agents) }),

  // Chat history
  getChatHistory: (agentId: string, limit = 100) =>
    request<ChatMessage[]>(`/agents/${agentId}/chat/history?limit=${limit}`),
  clearChatHistory: (agentId: string) =>
    request<void>(`/agents/${agentId}/chat/history`, { method: 'DELETE' }),

  // Session-aware chat history (for character personas)
  getSessionChatHistory: (agentId: string, sessionId: string, limit = 100) =>
    requestWithSession<ChatMessage[]>(`/agents/${agentId}/chat/history?limit=${limit}`, sessionId),
  clearSessionChatHistory: (agentId: string, sessionId: string) =>
    requestWithSession<void>(`/agents/${agentId}/chat/history`, sessionId, { method: 'DELETE' }),

  // Slack OAuth
  getSlackInstallUrl: (agentId: string) =>
    request<{ installUrl: string }>(`/slack-oauth/install/${agentId}`),
  disconnectSlack: (agentId: string) =>
    request<{ success: boolean }>(`/slack-oauth/disconnect/${agentId}`, { method: 'POST' }),
  getSlackStatus: (agentId: string) =>
    request<{ connected: boolean; teamName?: string; teamId?: string; hasAppToken?: boolean; appId?: string }>(`/slack-oauth/status/${agentId}`),
  getSlackBotProfile: (agentId: string) =>
    request<{ name?: string; icons?: { image_48?: string; image_72?: string }; botId?: string }>(`/slack-oauth/bot-profile/${agentId}`),
  updateSlackBotName: (agentId: string, displayName: string) =>
    request<{ ok: boolean }>(`/slack-oauth/bot-name/${agentId}`, { method: 'POST', body: JSON.stringify({ displayName }) }),
  uploadSlackBotAvatar: async (agentId: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/slack-oauth/bot-avatar/${agentId}`, { method: 'POST', body: form });
    if (!res.ok) { const err = await res.json().catch(() => ({ message: res.statusText })); throw new Error(err.message); }
    return res.json() as Promise<{ ok: boolean }>;
  },

  // Templates
  getTemplates: () => request<Template[]>('/templates'),
  getTemplate: (id: string) => request<Template>(`/templates/${id}`),
  createTemplate: (data: Partial<Template>) =>
    request<Template>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: string, data: Partial<Template>) =>
    request<Template>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) =>
    request<void>(`/templates/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (data: CreateProjectPayload) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<CreateProjectPayload>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),
  startProject: (id: string) =>
    request<Project>(`/projects/${id}/start`, { method: 'POST' }),
  pauseProject: (id: string) =>
    request<Project>(`/projects/${id}/pause`, { method: 'POST' }),
  resumeProject: (id: string) =>
    request<Project>(`/projects/${id}/resume`, { method: 'POST' }),
  completeProject: (id: string) =>
    request<Project>(`/projects/${id}/complete`, { method: 'POST' }),
  addProjectMembers: (id: string, agentIds: string[]) =>
    request<Project>(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ agent_ids: agentIds }) }),
  removeProjectMember: (id: string, agentId: string) =>
    request<Project>(`/projects/${id}/members/${agentId}`, { method: 'DELETE' }),
  getProjectMessages: (id: string, limit = 100) =>
    request<ProjectMessage[]>(`/projects/${id}/messages?limit=${limit}`),
  sendProjectMessage: (id: string, content: string) =>
    request<ProjectMessage>(`/projects/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Project Tasks
  getProjectTasks: (id: string) =>
    request<ProjectTask[]>(`/projects/${id}/tasks`),
  createProjectTask: (id: string, data: CreateTaskPayload) =>
    request<ProjectTask>(`/projects/${id}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateProjectTask: (id: string, taskId: string, data: UpdateTaskPayload) =>
    request<ProjectTask>(`/projects/${id}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProjectTask: (id: string, taskId: string) =>
    request<void>(`/projects/${id}/tasks/${taskId}`, { method: 'DELETE' }),

  // Project Slack
  setupProjectSlack: (id: string, channelId?: string) =>
    request<{ channelId: string; channelName: string }>(`/projects/${id}/slack/setup`, {
      method: 'POST',
      body: JSON.stringify(channelId ? { channel_id: channelId } : {}),
    }),
  disconnectProjectSlack: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}/slack/disconnect`, { method: 'POST' }),
  getProjectSlackStatus: (id: string) =>
    request<{ connected: boolean; channelId: string | null; channelName: string | null; listening: boolean }>(
      `/projects/${id}/slack/status`,
    ),

  // Characters
  getCharacters: () => request<CharacterListItem[]>('/characters'),
  provisionCharacter: (slug: string) =>
    request<Agent>(`/characters/${slug}/provision`, { method: 'POST' }),
};
