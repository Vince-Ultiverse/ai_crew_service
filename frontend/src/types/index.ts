export interface Agent {
  id: string;
  name: string;
  slug: string;
  status: 'running' | 'stopped' | 'error' | 'creating' | 'starting';
  role: string | null;
  container_id: string | null;
  slack_bot_token: string | null;
  slack_app_token: string | null;
  slack_enabled: boolean;
  slack_team_id: string | null;
  slack_team_name: string | null;
  slack_app_id: string | null;
  llm_provider: string;
  llm_api_key: string | null;
  llm_model: string | null;
  system_prompt: string | null;
  soul_prompt: string | null;
  agents_prompt: string | null;
  user_prompt: string | null;
  tools_prompt: string | null;
  openclaw_config: Record<string, any>;
  skills: string[];
  memory_limit: string;
  cpu_limit: number;
  gateway_port: number | null;
  gateway_token: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  llm_provider: string;
  llm_model: string | null;
  system_prompt: string | null;
  soul_prompt: string | null;
  agents_prompt: string | null;
  user_prompt: string | null;
  tools_prompt: string | null;
  openclaw_config: Record<string, any>;
  role: string | null;
  skills: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  agent_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  running: number;
  stopped: number;
  error: number;
}

export interface Project {
  id: string;
  name: string;
  goal: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  max_turns: number;
  current_turn: number;
  current_agent_id: string | null;
  pause_reason: string | null;
  coordinator_agent_id: string | null;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  members: ProjectMember[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  agent_id: string;
  agent: Agent;
  order_index: number;
  consecutive_failures: number;
  joined_at: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  agent_id: string | null;
  agent_name: string | null;
  content: string;
  turn_number: number;
  slack_ts: string | null;
  created_at: string;
}

export interface CreateProjectPayload {
  name: string;
  goal?: string;
  max_turns?: number;
  agent_ids?: string[];
  coordinator_agent_id?: string;
  slack_channel_id?: string;
}

export interface CreateAgentPayload {
  name: string;
  slug: string;
  role?: string;
  slack_bot_token?: string;
  slack_app_token?: string;
  slack_enabled?: boolean;
  llm_provider?: string;
  llm_api_key?: string;
  llm_model?: string;
  system_prompt?: string;
  soul_prompt?: string;
  agents_prompt?: string;
  user_prompt?: string;
  tools_prompt?: string;
  openclaw_config?: Record<string, any>;
  skills?: string[];
  memory_limit?: string;
  cpu_limit?: number;
  template_id?: string;
}
