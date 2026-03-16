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

      {/* Section 4: Channel Setup Guide (only when connected and has app token) */}
      {status?.connected && status.hasAppToken && (
        <div style={{
          marginBottom: 20,
          border: `2px solid ${colors.border}`,
          padding: 12,
          background: colors.bg,
        }}>
          <h3 style={{ fontSize: 12, color: colors.text, marginBottom: 8 }}>Channel Setup</h3>
          <div style={{ fontSize: 11, color: colors.textLight, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 8 }}>
              To let the agent receive and respond to messages, add it to a Slack channel:
            </div>
            <div>1. Open the Slack channel you want the agent to join</div>
            <div>2. Type <code style={{ background: colors.border, padding: '1px 4px' }}>/invite @{profile?.name || 'YourBot'}</code> and press Enter</div>
            <div style={{ margin: '6px 0', color: colors.textLight, fontSize: 10 }}>— or —</div>
            <div>1. Click the channel name at the top to open channel settings</div>
            <div>2. Go to <strong>Integrations</strong> tab</div>
            <div>3. Click <strong>Add an App</strong> and select your bot</div>
            <div style={{ marginTop: 10, padding: '8px 10px', background: colors.border, fontSize: 10, lineHeight: 1.6 }}>
              <strong>Tip:</strong> The agent will respond to direct messages automatically. For channels, mention <code>@{profile?.name || 'YourBot'}</code> to get a response, or the agent will listen to all messages in channels it's been added to.
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Not connected prompt */}
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
