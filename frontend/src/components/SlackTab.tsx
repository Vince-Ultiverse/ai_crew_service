import { useState, useEffect } from 'react';
import { api } from '../api/client';
import SlackConnectButton from './SlackConnectButton';
import { useTheme } from '../theme';

interface BotProfile {
  name?: string;
  icons?: { image_48?: string; image_72?: string };
  botId?: string;
}

interface SlackStatus {
  connected: boolean;
  teamName?: string;
  hasAppToken?: boolean;
  appId?: string;
}

export default function SlackTab({ agentId }: { agentId: string }) {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelInput, pixelButton, pixelButtonSmall } = theme;

  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [profile, setProfile] = useState<BotProfile | null>(null);
  const [botName, setBotName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [appTokenInput, setAppTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 12,
    color: colors.text,
  };

  const loadStatus = async () => {
    try {
      const s = await api.getSlackStatus(agentId);
      setStatus(s);
      if (s.connected) {
        try {
          const p = await api.getSlackBotProfile(agentId);
          setProfile(p);
          setBotName(p.name || '');
        } catch {}
      }
    } catch {}
  };

  useEffect(() => {
    loadStatus();
  }, [agentId]);

  const handleSaveName = async () => {
    if (!botName.trim()) return;
    setSavingName(true);
    try {
      await api.updateSlackBotName(agentId, botName.trim());
      await loadStatus();
    } catch (e: any) {
      alert(`Failed to update name: ${e.message}`);
    } finally {
      setSavingName(false);
    }
  };

  const appSettingsUrl = status?.appId
    ? `https://api.slack.com/apps/${status.appId}/general`
    : 'https://api.slack.com/apps';

  const handleSaveAppToken = async () => {
    if (!appTokenInput.trim()) return;
    setSavingToken(true);
    try {
      await api.updateAgent(agentId, { slack_app_token: appTokenInput.trim() });
      setAppTokenInput('');
      await loadStatus();
    } catch (e: any) {
      alert(`Failed to save App Token: ${e.message}`);
    } finally {
      setSavingToken(false);
    }
  };

  return (
    <div style={{
      ...pixelCard(),
      borderTop: 'none',
      boxShadow: `4px 4px 0px ${colors.border}`,
    }}>
      {/* Section 1: Connection */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, color: colors.text, marginBottom: 8 }}>Connection</h3>
        <SlackConnectButton agentId={agentId} onStatusChange={() => loadStatus()} />
      </div>

      {/* Section 2: App Token (only when connected but missing app token) */}
      {status?.connected && !status.hasAppToken && (
        <div style={{
          marginBottom: 20,
          border: `2px solid #b8860b`,
          padding: 12,
          background: '#fff8e1',
        }}>
          <h3 style={{ fontSize: 12, color: '#5d4037', marginBottom: 8 }}>App Token (required for Socket Mode)</h3>
          <div style={{ fontSize: 11, color: '#5d4037', lineHeight: 1.8, marginBottom: 10 }}>
            <div>1. Open <a href={appSettingsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0', fontWeight: 700 }}>Slack App Settings</a></div>
            <div>2. Scroll to <strong>App-Level Tokens</strong></div>
            <div>3. Click <strong>Generate Token and Scopes</strong></div>
            <div>4. Add scope: <code style={{ background: '#eee', padding: '1px 4px' }}>connections:write</code></div>
            <div>5. Copy the token and paste below</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={{ ...pixelInput(), flex: 1, margin: 0 }}
              type="password"
              placeholder="xapp-..."
              value={appTokenInput}
              onChange={(e) => setAppTokenInput(e.target.value)}
            />
            <button
              onClick={handleSaveAppToken}
              disabled={savingToken || !appTokenInput.trim()}
              style={{
                ...pixelButton('#4a9e5b'),
                padding: '8px 16px',
                fontSize: 11,
                opacity: savingToken || !appTokenInput.trim() ? 0.5 : 1,
              }}
            >
              {savingToken ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Section 3: Bot Profile (only when connected) */}
      {status?.connected && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, color: colors.text, marginBottom: 12 }}>Bot Profile</h3>

          {/* Avatar & App Settings */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            {profile?.icons?.image_72 ? (
              <img
                src={profile.icons.image_72}
                alt="Bot avatar"
                style={{ width: 48, height: 48, borderRadius: 8, border: `2px solid ${colors.border}` }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, background: colors.border, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: colors.textLight,
              }}>
                No icon
              </div>
            )}
            <a
              href={appSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...pixelButtonSmall(colors.accent), textDecoration: 'none', fontSize: 10 }}
            >
              Change Avatar in Slack App Settings
            </a>
          </div>

          {/* Display name */}
          <div>
            <label style={labelStyle}>Display Name</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...pixelInput(), flex: 1, margin: 0, maxWidth: 300 }}
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Bot display name"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !botName.trim()}
                style={{
                  ...pixelButtonSmall('#4a9e5b'),
                  fontSize: 10,
                  opacity: savingName || !botName.trim() ? 0.5 : 1,
                }}
              >
                {savingName ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Not connected prompt */}
      {!status?.connected && status !== null && (
        <div style={{
          padding: 16,
          textAlign: 'center',
          color: colors.textLight,
          fontSize: 12,
        }}>
          Connect to Slack to configure bot profile, avatar, and display name.
        </div>
      )}
    </div>
  );
}
