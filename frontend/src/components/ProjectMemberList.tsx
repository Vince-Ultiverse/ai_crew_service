import { useState, useEffect } from 'react';
import type { Project, Agent } from '../types';
import { api } from '../api/client';
import { useTheme } from '../theme';

export default function ProjectMemberList({ project, onUpdate }: {
  project: Project;
  onUpdate: () => void;
}) {
  const { theme } = useTheme();
  const { colors, pixelButtonSmall, pixelInput } = theme;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {});
  }, []);

  const memberIds = new Set(project.members?.map((m) => m.agent_id) || []);
  const availableAgents = agents.filter(
    (a) => !memberIds.has(a.id) && a.status === 'running',
  );

  const handleAdd = async () => {
    if (!selectedAgentId) return;
    try {
      await api.addProjectMembers(project.id, [selectedAgentId]);
      setSelectedAgentId('');
      setShowAdd(false);
      onUpdate();
    } catch (e: any) {
      alert(`Failed to add member: ${e.message}`);
    }
  };

  const handleRemove = async (agentId: string) => {
    if (project.status === 'running') {
      if (!confirm('Removing a member while the project is running will affect the collaboration. Continue?')) return;
    }
    try {
      await api.removeProjectMember(project.id, agentId);
      onUpdate();
    } catch (e: any) {
      alert(`Failed to remove member: ${e.message}`);
    }
  };

  return (
    <div>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        fontFamily: theme.fonts.heading,
        color: colors.text,
        marginBottom: 12,
      }}>
        Team Members
      </div>

      {project.members?.length === 0 && (
        <div style={{ fontSize: 12, color: colors.textLight, marginBottom: 12 }}>
          No members yet.
        </div>
      )}

      {project.members?.map((member) => (
        <div
          key={member.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            marginBottom: 4,
            background: member.agent_id === project.current_agent_id ? colors.cardHover : colors.card,
            border: `2px solid ${member.agent_id === project.current_agent_id ? colors.running : colors.border}`,
            fontSize: 12,
          }}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: member.agent?.status === 'running' ? colors.running : colors.stopped,
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: colors.text }}>
              {member.agent?.name || 'Unknown'}
              {member.agent_id === project.current_agent_id && (
                <span style={{ fontSize: 9, color: colors.running, marginLeft: 4 }}>speaking</span>
              )}
            </div>
            {member.agent?.role && (
              <div style={{ fontSize: 10, color: colors.textLight }}>{member.agent.role}</div>
            )}
          </div>
          <button
            onClick={() => handleRemove(member.agent_id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: colors.textLight,
              padding: '0 4px',
            }}
            title="Remove member"
          >
            x
          </button>
        </div>
      ))}

      {showAdd ? (
        <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            style={{ ...pixelInput(), width: 'auto', flex: 1, padding: '4px 8px', fontSize: 12 }}
          >
            <option value="">Select agent...</option>
            {availableAgents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button onClick={handleAdd} style={pixelButtonSmall(colors.accent)}>Add</button>
          <button onClick={() => setShowAdd(false)} style={pixelButtonSmall(colors.stopped)}>x</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            ...pixelButtonSmall(colors.accent),
            width: '100%',
            marginTop: 8,
          }}
        >
          + Add Member
        </button>
      )}
    </div>
  );
}
