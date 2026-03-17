import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Agent } from '../types';
import { api } from '../api/client';
import { useTheme } from '../theme';

export default function ProjectCreate() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButton, pixelInput, pixelHeading, pixelFieldset, pixelLegend, labels } = theme;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [maxTurns, setMaxTurns] = useState(50);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [coordinatorId, setCoordinatorId] = useState('');
  const [connectSlack, setConnectSlack] = useState(false);
  const [slackChannelId, setSlackChannelId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {});
  }, []);

  const runningAgents = agents.filter((a) => a.status === 'running');

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const project = await api.createProject({
        name: name.trim(),
        goal: goal.trim() || undefined,
        max_turns: maxTurns,
        agent_ids: selectedIds,
        coordinator_agent_id: coordinatorId || undefined,
      });

      // Set up Slack channel if requested
      if (connectSlack) {
        try {
          await api.setupProjectSlack(project.id, slackChannelId.trim() || undefined);
        } catch (slackErr: any) {
          alert(`Project created, but Slack setup failed: ${slackErr.message}`);
        }
      }

      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      alert(`Failed to create project: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ ...pixelHeading(), fontSize: 16, marginBottom: 24 }}>
        {labels.pageHeadings.projectCreate}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ ...pixelCard(), maxWidth: 640 }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: colors.text }}>
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Campaign Q1"
              required
              style={pixelInput()}
            />
          </div>

          {/* Goal */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: colors.text }}>
              Goal
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe the project objective..."
              rows={4}
              style={{ ...pixelInput(), resize: 'vertical' }}
            />
          </div>

          {/* Max Turns */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: colors.text }}>
              Max Turns
            </label>
            <input
              type="number"
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value, 10) || 50)}
              min={1}
              max={500}
              style={{ ...pixelInput(), width: 120 }}
            />
            <span style={{ fontSize: 11, color: colors.textLight, marginLeft: 8 }}>
              Maximum number of agent turns
            </span>
          </div>

          {/* Agent Selection */}
          <fieldset style={pixelFieldset()}>
            <legend style={pixelLegend()}>Team Members</legend>
            {runningAgents.length === 0 ? (
              <div style={{ fontSize: 12, color: colors.textLight }}>
                No running agents available. Start some agents first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {runningAgents.map((agent) => (
                  <label
                    key={agent.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      background: selectedIds.includes(agent.id) ? colors.cardHover : 'transparent',
                      border: `1px solid ${selectedIds.includes(agent.id) ? colors.accent : 'transparent'}`,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                    />
                    <span style={{ fontWeight: 700 }}>{agent.name}</span>
                    {agent.role && (
                      <span style={{ fontSize: 11, color: colors.textLight }}>({agent.role})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Coordinator */}
          {selectedIds.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: colors.text }}>
                Coordinator (optional)
              </label>
              <select
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                style={{ ...pixelInput(), width: 'auto' }}
              >
                <option value="">Round-robin (no coordinator)</option>
                {selectedIds.map((id) => {
                  const agent = agents.find((a) => a.id === id);
                  return agent ? (
                    <option key={id} value={id}>{agent.name}</option>
                  ) : null;
                })}
              </select>
              <div style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
                The coordinator decides which agent speaks next
              </div>
            </div>
          )}

          {/* Slack Integration */}
          {selectedIds.length > 0 && (
            <fieldset style={pixelFieldset()}>
              <legend style={pixelLegend()}>Slack Integration</legend>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={connectSlack}
                  onChange={(e) => setConnectSlack(e.target.checked)}
                />
                <span style={{ fontWeight: 700 }}>Connect to Slack channel</span>
              </label>
              {connectSlack && (
                <div style={{ marginTop: 10, paddingLeft: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: colors.text }}>
                    Channel ID (optional)
                  </label>
                  <input
                    type="text"
                    value={slackChannelId}
                    onChange={(e) => setSlackChannelId(e.target.value)}
                    placeholder="Leave empty to auto-create"
                    style={{ ...pixelInput(), width: 280 }}
                  />
                  <div style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
                    Enter an existing channel ID (e.g., C01ABC23DEF) or leave empty to create a new one.
                    Agents must have Slack connected.
                  </div>
                </div>
              )}
            </fieldset>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                ...pixelButton(colors.accent),
                opacity: saving || !name.trim() ? 0.5 : 1,
              }}
            >
              {saving ? 'Creating...' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              style={pixelButton(colors.stopped)}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
