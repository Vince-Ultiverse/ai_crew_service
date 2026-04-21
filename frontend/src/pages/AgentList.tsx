import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Agent } from '../types';
import { api } from '../api/client';
import AgentCard from '../components/AgentCard';
import { useTheme } from '../theme';

export default function AgentList() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButton, pixelHeading, labels } = theme;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getAgents().then(setAgents).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'rebuild' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm('Delete this agent?')) return;
        await api.deleteAgent(id);
      } else if (action === 'rebuild') {
        if (!confirm('Rebuild this agent? This will destroy the container and create a new one.')) return;
        await api.rebuildAgent(id);
      } else if (action === 'start') {
        await api.startAgent(id);
      } else if (action === 'stop') {
        await api.stopAgent(id);
      } else {
        await api.restartAgent(id);
      }
      load();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...pixelHeading(), fontSize: 16 }}>
          {labels.pageHeadings.agentList}
        </h1>
        <Link
          to="/admin/agents/new"
          style={{
            ...pixelButton(colors.accent),
            textDecoration: 'none',
            fontSize: 10,
          }}
        >
          {labels.newAgent}
        </Link>
      </div>

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
      ) : agents.length === 0 ? (
        <div style={{
          ...pixelCard(),
          textAlign: 'center',
          padding: 48,
        }}>
          <div style={{
            fontFamily: theme.fonts.heading,
            fontSize: 11,
            color: colors.textLight,
            marginBottom: 16,
            lineHeight: 2,
          }}>
            {labels.emptyOffice}
          </div>
          <Link
            to="/admin/agents/new"
            style={{
              ...pixelButton(colors.accent),
              textDecoration: 'none',
              fontSize: 10,
            }}
          >
            {labels.hirePrompt}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
