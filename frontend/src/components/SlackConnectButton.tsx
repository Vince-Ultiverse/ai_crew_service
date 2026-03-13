import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useTheme } from '../theme';

interface SlackStatus {
  connected: boolean;
  teamName?: string;
  teamId?: string;
  hasAppToken?: boolean;
  appId?: string;
}

export default function SlackConnectButton({
  agentId,
  onStatusChange,
}: {
  agentId: string;
  onStatusChange?: (connected: boolean) => void;
}) {
  const { theme } = useTheme();
  const { colors, pixelButton, pixelButtonSmall } = theme;
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await api.getSlackStatus(agentId);
      setStatus(s);
      onStatusChange?.(s.connected);
      return s;
    } catch {
      setStatus({ connected: false });
      return { connected: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [agentId]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { installUrl } = await api.getSlackInstallUrl(agentId);
      window.open(installUrl, '_blank', 'width=800,height=800');

      pollRef.current = setInterval(async () => {
        const s = await fetchStatus();
        if (s.connected) {
          setConnecting(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }, 2000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setConnecting(false);
        }
      }, 120000);
    } catch (e: any) {
      console.log(e);
      alert(`Failed to start Slack OAuth: ${e.message}`);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Slack from this agent?')) return;
    try {
      await api.disconnectSlack(agentId);
      await fetchStatus();
    } catch (e: any) {
      alert(`Failed to disconnect: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: colors.textLight, padding: '8px 0' }}>
        Checking Slack status...
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: status.hasAppToken ? '#4a9e5b' : '#b8860b',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 12, color: colors.text }}>
            Connected to <strong>{status.teamName || 'Slack'}</strong>
            {status.hasAppToken && (
              <span style={{ color: '#4a9e5b', marginLeft: 6, fontSize: 11 }}>
                (Bot + App Token ready)
              </span>
            )}
            {!status.hasAppToken && (
              <span style={{ color: '#b8860b', marginLeft: 6, fontSize: 11 }}>
                (App Token missing)
              </span>
            )}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            ...pixelButtonSmall('#c94040'),
            fontSize: 10,
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <button
        onClick={handleConnect}
        disabled={connecting}
        style={{
          ...pixelButton('#4A154B'),
          padding: '10px 20px',
          fontSize: 11,
          opacity: connecting ? 0.6 : 1,
          cursor: connecting ? 'wait' : 'pointer',
        }}
      >
        {connecting ? 'Waiting for authorization...' : 'Connect to Slack'}
      </button>
    </div>
  );
}
