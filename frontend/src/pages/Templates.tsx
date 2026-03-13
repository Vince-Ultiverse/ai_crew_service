import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Template } from '../types';
import { api } from '../api/client';
import WorkspaceEditor from '../components/WorkspaceEditor';
import RoleBadge, { PREDEFINED_ROLES } from '../components/RoleBadge';
import { useTheme } from '../theme';

export default function Templates() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButton, pixelButtonSmall, pixelInput, pixelHeading, labels } = theme;
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getTemplates().then(setTemplates).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.updateTemplate(editing.id, editing);
      } else {
        await api.createTemplate(editing);
      }
      setEditing(null);
      load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.deleteTemplate(id);
      load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 12,
    color: colors.text,
    display: 'block',
    marginBottom: 4,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...pixelHeading(), fontSize: 16 }}>
          {labels.pageHeadings.templates}
        </h1>
        <button
          onClick={() => setEditing({ name: '', role: '', llm_provider: 'anthropic', llm_model: '', system_prompt: '', soul_prompt: '', agents_prompt: '', user_prompt: '', tools_prompt: '', openclaw_config: {}, skills: [] })}
          style={{
            ...pixelButton(colors.accent),
            fontSize: 10,
          }}
        >
          {labels.newTemplate}
        </button>
      </div>

      {/* Editor Modal */}
      {editing && (
        <div style={{
          ...pixelCard(),
          marginBottom: 24,
          borderColor: colors.accent,
        }}>
          <h2 style={{ ...pixelHeading(), fontSize: 12, marginBottom: 16 }}>
            {editing.id ? 'Edit Template' : 'New Template'}
          </h2>
          <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={pixelInput()} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input style={pixelInput()} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  style={{ ...pixelInput(), flex: 1 }}
                  value={PREDEFINED_ROLES.includes(editing.role || '') ? (editing.role || '') : (editing.role ? '__custom__' : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') return;
                    setEditing({ ...editing, role: e.target.value });
                  }}
                >
                  <option value="">-- None --</option>
                  {PREDEFINED_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  {editing.role && !PREDEFINED_ROLES.includes(editing.role) && (
                    <option value="__custom__">Custom: {editing.role}</option>
                  )}
                </select>
                <input
                  style={{ ...pixelInput(), flex: 1 }}
                  value={editing.role || ''}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  placeholder="Or type custom role..."
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>LLM Provider</label>
              <select style={pixelInput()} value={editing.llm_provider || 'anthropic'} onChange={(e) => setEditing({ ...editing, llm_provider: e.target.value })}>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="zai">z.ai</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Model</label>
              <input style={pixelInput()} value={editing.llm_model || ''} onChange={(e) => setEditing({ ...editing, llm_model: e.target.value })} />
            </div>
            <WorkspaceEditor
              values={{
                system_prompt: editing.system_prompt || '',
                soul_prompt: editing.soul_prompt || '',
                agents_prompt: editing.agents_prompt || '',
                user_prompt: editing.user_prompt || '',
                tools_prompt: editing.tools_prompt || '',
              }}
              onChange={(key, value) => setEditing({ ...editing, [key]: value })}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} style={pixelButtonSmall(colors.accent)}>
                Save
              </button>
              <button onClick={() => setEditing(null)} style={pixelButtonSmall(colors.stopped, colors.text)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div style={{
          ...pixelCard(),
          textAlign: 'center',
          fontFamily: theme.fonts.heading,
          fontSize: 10,
          color: colors.textLight,
        }}>
          Loading...
        </div>
      ) : templates.length === 0 ? (
        <div style={{
          ...pixelCard(),
          textAlign: 'center',
          padding: 48,
        }}>
          <div style={{
            fontFamily: theme.fonts.heading,
            fontSize: 11,
            color: colors.textLight,
            lineHeight: 2,
          }}>
            {labels.emptyArchive}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {templates.map((t) => (
            <div key={t.id} style={{
              ...pixelCard(),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
                    {t.name}
                  </span>
                  <RoleBadge role={t.role} />
                </div>
                <div style={{ color: colors.textLight, fontSize: 12, marginTop: 4 }}>
                  {t.description || 'No description'} | {t.llm_provider} {t.llm_model && `/ ${t.llm_model}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => navigate(`/agents/new?template=${t.id}`)} style={pixelButtonSmall(colors.accent)}>
                  Create Agent
                </button>
                <button onClick={() => setEditing(t)} style={pixelButtonSmall(colors.card, colors.accent)}>
                  Edit
                </button>
                <button onClick={() => handleDelete(t.id)} style={pixelButtonSmall('#c94040')}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
