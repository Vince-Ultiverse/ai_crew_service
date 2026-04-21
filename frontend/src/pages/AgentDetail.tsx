import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import type { Agent } from '../types';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RoleBadge from '../components/RoleBadge';
import PixelCharacter, { CorporateAvatar } from '../components/PixelCharacter';
import AgentChat from '../components/AgentChat';
import SlackTab from '../components/SlackTab';
import { useTheme } from '../theme';

export default function AgentDetail() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButtonSmall, pixelHeading, pixelInput, labels } = theme;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [logs, setLogs] = useState('');
  const [tab, setTab] = useState<'info' | 'webui' | 'logs' | 'config' | 'slack'>('info');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tailLines, setTailLines] = useState(200);
  const [slackMessage, setSlackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLPreElement>(null);
  const [searchParams] = useSearchParams();

  const load = () => {
    if (!id) return;
    api.getAgent(id).then(setAgent).catch(() => navigate('/admin/agents'));
  };

  useEffect(() => { load(); }, [id]);

  // Handle Slack OAuth callback params
  useEffect(() => {
    const slackParam = searchParams.get('slack');
    if (slackParam === 'connected') {
      const team = searchParams.get('team') || 'Slack';
      setSlackMessage({ type: 'success', text: `Connected to ${team}` });
      setTab('slack');
      load();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (slackParam === 'error') {
      const msg = searchParams.get('message') || 'Unknown error';
      setSlackMessage({ type: 'error', text: `Slack connection failed: ${msg}` });
      setTab('slack');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  const fetchLogs = useCallback(() => {
    if (!id) return;
    api.getAgentLogs(id, tailLines).then(setLogs).catch(() => setLogs('Failed to load logs'));
  }, [id, tailLines]);

  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab, fetchLogs]);

  useEffect(() => {
    if (tab !== 'logs' || !autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [tab, autoRefresh, fetchLogs]);

  useEffect(() => {
    if (autoRefresh && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'rebuild' | 'delete') => {
    if (!id) return;
    try {
      if (action === 'delete') {
        if (!confirm('Delete this agent?')) return;
        await api.deleteAgent(id);
        navigate('/admin/agents');
        return;
      }
      if (action === 'rebuild') {
        if (!confirm('Rebuild this agent? This will destroy the container and create a new one with latest config.')) return;
        await api.rebuildAgent(id);
      } else if (action === 'start') await api.startAgent(id);
      else if (action === 'stop') await api.stopAgent(id);
      else await api.restartAgent(id);
      load();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    }
  };

  if (!agent) return (
    <div style={{
      ...pixelCard(),
      textAlign: 'center',
      fontFamily: theme.fonts.heading,
      fontSize: 10,
      color: colors.textLight,
    }}>
      Loading...
    </div>
  );

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: `2px solid ${active ? colors.borderDark : 'transparent'}`,
    borderBottom: active ? `2px solid ${colors.card}` : `2px solid ${colors.borderDark}`,
    background: active ? colors.card : 'transparent',
    color: active ? colors.text : colors.textLight,
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 9,
    fontFamily: theme.fonts.heading,
    borderRadius: 0,
    marginBottom: -2,
    position: 'relative' as const,
    zIndex: active ? 1 : 0,
  });

  return (
    <div>
      {/* Header with character */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {theme.characterMode === 'corporate'
            ? <CorporateAvatar status={agent.status} size={56} />
            : <PixelCharacter status={agent.status} size={4} />
          }
          <div>
            <h1 style={{ ...pixelHeading(), fontSize: 14, marginBottom: 8 }}>{agent.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge status={agent.status} />
              <RoleBadge role={agent.role} />
              <span style={{ color: colors.textLight, fontSize: 12 }}>slug: {agent.slug}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {agent.status === 'running' && agent.gateway_port && (
            <DetailActionBtn label="Chat" bg={colors.accent} onClick={() => setTab('webui')} />
          )}
          {(agent.status === 'stopped' || agent.status === 'error') && (
            <DetailActionBtn label="Start" bg="#4a9e5b" onClick={() => handleAction('start')} />
          )}
          {agent.status === 'running' && (
            <DetailActionBtn label="Stop" bg="#c94040" onClick={() => handleAction('stop')} />
          )}
          {agent.status !== 'creating' && (
            <DetailActionBtn label="Restart" bg="#b8860b" onClick={() => handleAction('restart')} />
          )}
          {agent.status !== 'creating' && (
            <DetailActionBtn label="Rebuild" bg="#6c63ff" onClick={() => handleAction('rebuild')} />
          )}
          <Link to={`/admin/agents/${agent.id}/edit`} style={{
            ...pixelButtonSmall(colors.card, colors.accent),
            textDecoration: 'none',
            border: `2px solid ${colors.accent}`,
          }}>Edit</Link>
          <DetailActionBtn label="Delete" bg="#c94040" onClick={() => handleAction('delete')} />
        </div>
      </div>

      {/* Slack OAuth feedback */}
      {slackMessage && (
        <div style={{
          padding: '8px 12px',
          marginBottom: 12,
          fontSize: 12,
          border: `2px solid ${slackMessage.type === 'success' ? '#4a9e5b' : '#c94040'}`,
          background: slackMessage.type === 'success' ? '#e8f5e9' : '#fde8e8',
          color: slackMessage.type === 'success' ? '#2e7d32' : '#c94040',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{slackMessage.text}</span>
          <button
            onClick={() => setSlackMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit' }}
          >
            x
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ borderBottom: `2px solid ${colors.borderDark}`, marginBottom: 0, display: 'flex' }}>
        <button style={tabStyle(tab === 'info')} onClick={() => setTab('info')}>{labels.tabs.info}</button>
        {(agent.status === 'running' || agent.status === 'starting') && agent.gateway_port && (
          <button style={tabStyle(tab === 'webui')} onClick={() => setTab('webui')}>Chat</button>
        )}
        <button style={tabStyle(tab === 'slack')} onClick={() => setTab('slack')}>Slack</button>
        <button style={tabStyle(tab === 'logs')} onClick={() => setTab('logs')}>{labels.tabs.logs}</button>
        <button style={tabStyle(tab === 'config')} onClick={() => setTab('config')}>{labels.tabs.config}</button>
      </div>

      {tab === 'info' && (
        <div style={{
          ...pixelCard(),
          borderTop: 'none',
          boxShadow: `4px 4px 0px ${colors.border}`,
        }}>
          <InfoRow label="Container ID" value={agent.container_id || 'N/A'} />
          <InfoRow label="Gateway Port" value={String(agent.gateway_port || 'N/A')} />
          <InfoRow label="LLM Provider" value={agent.llm_provider} />
          <InfoRow label="LLM Model" value={agent.llm_model || 'Default'} />
          <InfoRow
            label="Slack"
            value={
              agent.slack_team_name
                ? `Connected to ${agent.slack_team_name}`
                : agent.slack_enabled ? 'Enabled (not connected)' : 'Disabled'
            }
          />
          <InfoRow label="Memory" value={agent.memory_limit} />
          <InfoRow label="CPU" value={String(agent.cpu_limit)} />
          <InfoRow label="Hired On" value={new Date(agent.created_at).toLocaleString()} />
          {agent.system_prompt && (
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 12, color: colors.text }}>System Prompt:</strong>
              <pre style={{
                background: colors.background,
                padding: 12,
                border: `2px solid ${colors.border}`,
                borderRadius: 0,
                marginTop: 4,
                whiteSpace: 'pre-wrap',
                fontSize: 12,
                color: colors.text,
              }}>
                {agent.system_prompt}
              </pre>
            </div>
          )}
        </div>
      )}

      {tab === 'webui' && agent.gateway_port && (
        <div style={{
          border: `2px solid ${colors.borderDark}`,
          borderTop: 'none',
          borderRadius: 0,
          overflow: 'hidden',
          boxShadow: `4px 4px 0px ${colors.border}`,
        }}>
          {/* Toolbar with Open WebUI link */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', padding: '4px 8px',
            background: colors.card, borderBottom: `1px solid ${colors.border}`,
          }}>
            <a
              href={`${window.location.protocol}//${window.location.hostname}:${agent.gateway_port}/${agent.gateway_token ? `#token=${agent.gateway_token}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...pixelButtonSmall(colors.accent), textDecoration: 'none', fontSize: 9 }}
            >
              Open in New Window
            </a>
          </div>
          <AgentChat
            agentId={agent.id}
            agentName={agent.name}
            agentStatus={agent.status}
          />
        </div>
      )}

      {tab === 'slack' && id && (
        <SlackTab agentId={id} />
      )}

      {tab === 'logs' && (
        <div>
          {/* Toolbar */}
          <div style={{
            display: 'flex', gap: 12, alignItems: 'center',
            background: colors.card, padding: '8px 12px',
            border: `3px solid ${colors.border}`,
            borderTop: 'none',
            borderBottom: `2px solid ${colors.border}`,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <select
              value={tailLines}
              onChange={(e) => setTailLines(Number(e.target.value))}
              style={{ ...pixelInput(), width: 'auto', padding: '4px 8px', fontSize: 12 }}
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={200}>200 lines</option>
              <option value={500}>500 lines</option>
              <option value={1000}>1000 lines</option>
            </select>
            <button
              onClick={fetchLogs}
              style={pixelButtonSmall(colors.accent)}
            >
              Refresh
            </button>
            {autoRefresh && (
              <span style={{ fontSize: 9, color: colors.textLight, fontFamily: theme.fonts.heading }}>
                updating 3s
              </span>
            )}
          </div>
          {/* Log output */}
          <div style={{
            background: colors.logBg,
            border: `3px solid ${colors.border}`,
            borderTop: 'none',
            borderRadius: 0,
            padding: 16,
            boxShadow: `4px 4px 0px ${colors.border}`,
          }}>
            <pre
              ref={logsContainerRef}
              style={{
                color: colors.logText, fontSize: 12, fontFamily: theme.fonts.mono,
                whiteSpace: 'pre-wrap', maxHeight: 600, overflow: 'auto',
                margin: 0, lineHeight: 1.6,
              }}
            >
              {logs || 'No logs available'}
              <div ref={logsEndRef} />
            </pre>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div style={{
          ...pixelCard(),
          borderTop: 'none',
          boxShadow: `4px 4px 0px ${colors.border}`,
        }}>
          <pre style={{
            fontSize: 12,
            fontFamily: theme.fonts.mono,
            whiteSpace: 'pre-wrap',
            color: colors.text,
          }}>
            {JSON.stringify(agent.openclaw_config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: `1px dashed ${colors.border}` }}>
      <div style={{ width: 160, color: colors.textLight, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 12, color: colors.text }}>{value}</div>
    </div>
  );
}

function DetailActionBtn({ label, bg, onClick }: { label: string; bg: string; onClick: () => void }) {
  const { theme } = useTheme();
  return (
    <button onClick={onClick} style={theme.pixelButtonSmall(bg)}>
      {label}
    </button>
  );
}
