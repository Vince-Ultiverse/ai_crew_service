import { Link } from 'react-router-dom';
import type { Agent } from '../types';
import StatusBadge from './StatusBadge';
import RoleBadge from './RoleBadge';
import PixelCharacter, { CorporateAvatar } from './PixelCharacter';
import { useTheme } from '../theme';

export default function AgentCard({ agent, onAction }: {
  agent: Agent;
  onAction: (id: string, action: 'start' | 'stop' | 'restart' | 'rebuild' | 'delete') => void;
}) {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButtonSmall, pixelHeading } = theme;

  return (
    <div style={{
      ...pixelCard(),
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'transform 0.1s, box-shadow 0.1s',
    }}>
      {/* Character + name plate area */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {theme.characterMode === 'corporate'
          ? <CorporateAvatar status={agent.status} size={48} />
          : <PixelCharacter status={agent.status} size={3} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={`/agents/${agent.id}`}
            style={{
              ...pixelHeading(),
              fontSize: 11,
              display: 'block',
              textDecoration: 'none',
              marginBottom: 6,
              lineHeight: 1.5,
            }}
          >
            {agent.name}
          </Link>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={agent.status} />
            <RoleBadge role={agent.role} />
          </div>
        </div>
      </div>

      {/* Desk nameplate info */}
      <div style={{
        fontSize: 12,
        color: colors.textLight,
        background: colors.background,
        padding: '8px 10px',
        border: `2px solid ${colors.border}`,
        borderRadius: 0,
      }}>
        <div>Slug: {agent.slug}</div>
        <div>LLM: {agent.llm_provider} {agent.llm_model && `/ ${agent.llm_model}`}</div>
        <div>Port: {agent.gateway_port || 'N/A'}</div>
        <div>Slack: {agent.slack_enabled ? 'ON' : 'OFF'}</div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {agent.status === 'running' && agent.gateway_port && (
          <a
            href={`${window.location.protocol}//${window.location.hostname}:${agent.gateway_port}/${agent.gateway_token ? `#token=${agent.gateway_token}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...pixelButtonSmall(colors.accent),
              textDecoration: 'none',
            }}
          >
            WebUI
          </a>
        )}
        {(agent.status === 'stopped' || agent.status === 'error') && (
          <ActionBtn label="Start" bg="#4a9e5b" onClick={() => onAction(agent.id, 'start')} />
        )}
        {agent.status === 'running' && (
          <ActionBtn label="Stop" bg="#c94040" onClick={() => onAction(agent.id, 'stop')} />
        )}
        {agent.status !== 'creating' && (
          <ActionBtn label="Restart" bg="#b8860b" onClick={() => onAction(agent.id, 'restart')} />
        )}
        {agent.status !== 'creating' && (
          <ActionBtn label="Rebuild" bg="#6c63ff" onClick={() => onAction(agent.id, 'rebuild')} />
        )}
        <ActionBtn label="Delete" bg="#c94040" onClick={() => onAction(agent.id, 'delete')} />
      </div>
    </div>
  );
}

function ActionBtn({ label, bg, onClick }: { label: string; bg: string; onClick: () => void }) {
  const { theme } = useTheme();
  return (
    <button onClick={onClick} style={theme.pixelButtonSmall(bg)}>
      {label}
    </button>
  );
}
