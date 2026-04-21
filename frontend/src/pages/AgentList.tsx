import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Agent } from '../types';
import { api } from '../api/client';
import AgentCard from '../components/AgentCard';
import { useTheme } from '../theme';

type Tab = 'custom' | 'character';

export default function AgentList() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButton, pixelHeading, pixelButtonSmall, labels } = theme;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('custom');

  const load = () => {
    setLoading(true);
    api.getAgents(tab).then(setAgents).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    ...pixelButtonSmall(active ? colors.accent : colors.stopped),
    fontSize: 9,
    opacity: active ? 1 : 0.6,
    cursor: 'pointer',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ ...pixelHeading(), fontSize: 16 }}>
          {labels.pageHeadings.agentList}
        </h1>
        {tab === 'custom' && (
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
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('custom')} style={tabStyle(tab === 'custom')}>
          Custom Agents
        </button>
        <button onClick={() => setTab('character')} style={tabStyle(tab === 'character')}>
          Character Personas
        </button>
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
            {tab === 'character'
              ? 'No character agents provisioned yet. Visit the Characters page to start a conversation.'
              : labels.emptyOffice}
          </div>
          {tab === 'custom' && (
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
          )}
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
