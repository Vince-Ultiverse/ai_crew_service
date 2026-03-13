import { useState, useEffect } from 'react';
import type { CreateAgentPayload, Template } from '../types';
import { api } from '../api/client';
import ConfigEditor from './ConfigEditor';
import WorkspaceEditor from './WorkspaceEditor';
import SlackConnectButton from './SlackConnectButton';
import { PREDEFINED_ROLES } from './RoleBadge';
import { useTheme } from '../theme';

export default function AgentForm({
  initial,
  onSubmit,
  submitLabel,
  agentId,
  initialTemplateId,
}: {
  initial?: Partial<CreateAgentPayload>;
  onSubmit: (data: CreateAgentPayload) => void;
  submitLabel: string;
  agentId?: string;
  initialTemplateId?: string;
}) {
  const { theme } = useTheme();
  const { colors, pixelInput, pixelButton, pixelFieldset, pixelLegend } = theme;

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 12,
    color: colors.text,
  };

  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<CreateAgentPayload>({
    name: '',
    slug: '',
    role: '',
    llm_provider: 'anthropic',
    llm_model: '',
    llm_api_key: '',
    slack_bot_token: '',
    slack_app_token: '',
    slack_enabled: true,
    system_prompt: '',
    soul_prompt: '',
    agents_prompt: '',
    user_prompt: '',
    tools_prompt: '',
    openclaw_config: {},
    skills: [],
    memory_limit: '512m',
    cpu_limit: 0.5,
    template_id: '',
    ...initial,
  });

  useEffect(() => {
    api.getTemplates().then((tpls) => {
      setTemplates(tpls);
      // Auto-apply template from URL param
      if (initialTemplateId) {
        const t = tpls.find((tpl) => tpl.id === initialTemplateId);
        if (t) {
          setForm((prev) => ({
            ...prev,
            template_id: t.id,
            role: t.role || '',
            llm_provider: t.llm_provider,
            llm_model: t.llm_model || '',
            system_prompt: t.system_prompt || '',
            soul_prompt: t.soul_prompt || '',
            agents_prompt: t.agents_prompt || '',
            user_prompt: t.user_prompt || '',
            tools_prompt: t.tools_prompt || '',
            openclaw_config: t.openclaw_config,
            skills: t.skills,
          }));
        }
      }
    }).catch(() => {});
  }, [initialTemplateId]);

  const set = (key: keyof CreateAgentPayload, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) {
      setForm((prev) => ({
        ...prev,
        template_id: templateId,
        role: t.role || '',
        llm_provider: t.llm_provider,
        llm_model: t.llm_model || '',
        system_prompt: t.system_prompt || '',
        soul_prompt: t.soul_prompt || '',
        agents_prompt: t.agents_prompt || '',
        user_prompt: t.user_prompt || '',
        tools_prompt: t.tools_prompt || '',
        openclaw_config: t.openclaw_config,
        skills: t.skills,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      {/* Template Selection */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>From Template</label>
          <select
            value={form.template_id || ''}
            onChange={(e) => applyTemplate(e.target.value)}
            style={pixelInput()}
          >
            <option value="">-- None --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Basic Info */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Name</label>
        <input style={pixelInput()} value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Slug (unique identifier)</label>
        <input style={pixelInput()} value={form.slug} onChange={(e) => set('slug', e.target.value)} required pattern="[a-zA-Z0-9_\-]+" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Role</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            style={{ ...pixelInput(), flex: 1 }}
            value={PREDEFINED_ROLES.includes(form.role || '') ? form.role : '__custom__'}
            onChange={(e) => {
              if (e.target.value === '__custom__') return;
              set('role', e.target.value);
            }}
          >
            <option value="">-- None --</option>
            {PREDEFINED_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            {form.role && !PREDEFINED_ROLES.includes(form.role) && (
              <option value="__custom__">Custom: {form.role}</option>
            )}
          </select>
          <input
            style={{ ...pixelInput(), flex: 1 }}
            value={form.role || ''}
            onChange={(e) => set('role', e.target.value)}
            placeholder="Or type custom role..."
          />
        </div>
      </div>

      {/* Slack */}
      <fieldset style={pixelFieldset()}>
        <legend style={pixelLegend()}>Slack Config</legend>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.slack_enabled} onChange={(e) => set('slack_enabled', e.target.checked)} />
            Enable Slack
          </label>
        </div>
        {agentId ? (
          <>
            <SlackConnectButton
              agentId={agentId}
              onStatusChange={(connected) => {
                if (connected) set('slack_enabled', true);
              }}
            />
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 11, color: colors.textLight, cursor: 'pointer' }}>
                Manual token setup
              </summary>
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Bot Token</label>
                  <input style={pixelInput()} type="password" value={form.slack_bot_token || ''} onChange={(e) => set('slack_bot_token', e.target.value)} placeholder="xoxb-..." />
                </div>
                <div>
                  <label style={labelStyle}>App Token (required for Socket Mode)</label>
                  <input style={pixelInput()} type="password" value={form.slack_app_token || ''} onChange={(e) => set('slack_app_token', e.target.value)} placeholder="xapp-..." />
                </div>
              </div>
            </details>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: colors.textLight, marginBottom: 12 }}>
              Save the agent first, then connect to Slack from the edit page. Or enter tokens manually below.
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Bot Token</label>
              <input style={pixelInput()} type="password" value={form.slack_bot_token || ''} onChange={(e) => set('slack_bot_token', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>App Token</label>
              <input style={pixelInput()} type="password" value={form.slack_app_token || ''} onChange={(e) => set('slack_app_token', e.target.value)} />
            </div>
          </>
        )}
      </fieldset>

      {/* LLM */}
      <fieldset style={pixelFieldset()}>
        <legend style={pixelLegend()}>LLM Config</legend>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Provider</label>
          <select style={pixelInput()} value={form.llm_provider} onChange={(e) => set('llm_provider', e.target.value)}>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="zai">z.ai</option>
            <option value="ollama">Ollama</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>API Key</label>
          <input style={pixelInput()} type="password" value={form.llm_api_key || ''} onChange={(e) => set('llm_api_key', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Model</label>
          <input style={pixelInput()} value={form.llm_model || ''} onChange={(e) => set('llm_model', e.target.value)} placeholder="e.g. claude-sonnet-4-5-20250929" />
        </div>
      </fieldset>

      {/* Workspace Files */}
      <WorkspaceEditor
        values={{
          system_prompt: form.system_prompt || '',
          soul_prompt: form.soul_prompt || '',
          agents_prompt: form.agents_prompt || '',
          user_prompt: form.user_prompt || '',
          tools_prompt: form.tools_prompt || '',
        }}
        onChange={(key, value) => set(key as keyof CreateAgentPayload, value)}
      />

      {/* Config Editor */}
      <ConfigEditor
        label="OpenClaw Config Override (JSON)"
        value={form.openclaw_config || {}}
        onChange={(val) => set('openclaw_config', val)}
      />

      {/* Resources */}
      <fieldset style={pixelFieldset()}>
        <legend style={pixelLegend()}>Resources</legend>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Memory</label>
            <select style={pixelInput()} value={form.memory_limit} onChange={(e) => set('memory_limit', e.target.value)}>
              <option value="256m">256 MB</option>
              <option value="512m">512 MB</option>
              <option value="1g">1 GB</option>
              <option value="2g">2 GB</option>
              <option value="4g">4 GB</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>CPU Cores</label>
            <select style={pixelInput()} value={String(form.cpu_limit)} onChange={(e) => set('cpu_limit', parseFloat(e.target.value))}>
              <option value="0.25">0.25</option>
              <option value="0.5">0.5</option>
              <option value="1">1.0</option>
              <option value="2">2.0</option>
            </select>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        style={{
          ...pixelButton(colors.accent),
          padding: '12px 28px',
          fontSize: 11,
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
