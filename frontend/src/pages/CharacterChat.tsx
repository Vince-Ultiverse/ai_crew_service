import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { api } from '../api/client';
import AgentChat from '../components/AgentChat';
import type { Agent } from '../types';

export default function CharacterChat() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { colors } = theme;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [provisioning, setProvisioning] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Provision character on mount
  useEffect(() => {
    if (!slug) return;
    setProvisioning(true);
    setError('');
    api.provisionCharacter(slug)
      .then(setAgent)
      .catch((e) => setError(e.message))
      .finally(() => setProvisioning(false));
  }, [slug]);

  // Poll for status until running
  useEffect(() => {
    if (!agent || agent.status === 'running') return;
    if (agent.status === 'error') return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getAgentStatus(agent.id);
        if (status.status === 'running') {
          setAgent((prev) => prev ? { ...prev, status: 'running' } : prev);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (status.status === 'error') {
          setAgent((prev) => prev ? { ...prev, status: 'error' } : prev);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [agent?.id, agent?.status]);

  if (provisioning) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 120px)',
        color: colors.textLight,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>&#9203;</div>
        <div style={{
          fontFamily: theme.fonts.heading,
          fontSize: 14,
          marginBottom: 8,
        }}>
          {theme.name === 'severance'
            ? 'Initializing persona protocol...'
            : 'Preparing character agent...'}
        </div>
        <div style={{ fontSize: 12, fontFamily: theme.fonts.mono }}>
          This may take a moment on first use
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 120px)',
        color: colors.textLight,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>&#9888;</div>
        <div style={{
          fontFamily: theme.fonts.heading,
          fontSize: 14,
          color: '#f44336',
          marginBottom: 12,
        }}>
          Failed to provision character
        </div>
        <div style={{
          fontSize: 12,
          fontFamily: theme.fonts.mono,
          color: colors.textLight,
          maxWidth: 400,
          textAlign: 'center',
          marginBottom: 16,
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/characters')}
          style={theme.pixelButtonSmall(colors.accent)}
        >
          Back to Characters
        </button>
      </div>
    );
  }

  if (!agent) return null;

  const isReady = agent.status === 'running';

  return (
    <div style={{ height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `2px solid ${colors.border}`,
        background: colors.card,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate('/characters')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: colors.textLight,
            padding: '0 4px',
          }}
        >
          &#8592;
        </button>
        <div>
          <div style={{
            fontFamily: theme.fonts.heading,
            fontSize: 14,
            fontWeight: 700,
            color: colors.text,
          }}>
            {agent.name}
          </div>
          {agent.tagline && (
            <div style={{
              fontSize: 11,
              color: colors.textLight,
              fontFamily: theme.fonts.mono,
            }}>
              {agent.tagline}
            </div>
          )}
        </div>
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isReady ? '#4caf50' : '#ff9800',
          }} />
          <span style={{
            fontSize: 10,
            fontFamily: theme.fonts.heading,
            color: colors.textLight,
            textTransform: 'uppercase',
          }}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isReady ? (
          <AgentChat
            agentId={agent.id}
            agentName={agent.name}
            agentStatus={agent.status}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: colors.textLight,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#9203;</div>
            <div style={{ fontSize: 13, fontFamily: theme.fonts.mono }}>
              {agent.name} is starting up...
            </div>
            <div style={{ fontSize: 11, marginTop: 8 }}>
              Please wait for the container to become ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
