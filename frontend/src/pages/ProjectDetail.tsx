import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Project } from '../types';
import { api } from '../api/client';
import ProjectChat from '../components/ProjectChat';
import ProjectMemberList from '../components/ProjectMemberList';
import ProjectTaskPanel from '../components/ProjectTaskPanel';
import { useTheme } from '../theme';

export default function ProjectDetail() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelHeading } = theme;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [slackStatus, setSlackStatus] = useState<{
    connected: boolean; channelId: string | null;
    channelName: string | null; listening: boolean;
  } | null>(null);
  const [slackLoading, setSlackLoading] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api.getProject(id).then((p) => {
      setProject(p);
      api.getProjectSlackStatus(id).then(setSlackStatus).catch(() => {});
    }).catch(() => navigate('/admin/projects'));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh project status when running or paused
  useEffect(() => {
    if (!project || (project.status !== 'running' && project.status !== 'paused')) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [project?.status, load]);

  const handleSlackConnect = async () => {
    if (!id) return;
    const channelId = prompt('Enter Slack channel ID (leave empty to auto-create):');
    if (channelId === null) return; // cancelled
    setSlackLoading(true);
    try {
      await api.setupProjectSlack(id, channelId.trim() || undefined);
      load();
    } catch (e: any) {
      alert(`Slack setup failed: ${e.message}`);
    } finally {
      setSlackLoading(false);
    }
  };

  const handleSlackDisconnect = async () => {
    if (!id) return;
    if (!confirm('Disconnect Slack channel from this project?')) return;
    setSlackLoading(true);
    try {
      await api.disconnectProjectSlack(id);
      setSlackStatus(null);
      load();
    } catch (e: any) {
      alert(`Failed to disconnect: ${e.message}`);
    } finally {
      setSlackLoading(false);
    }
  };

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'complete' | 'delete') => {
    if (!id) return;
    try {
      if (action === 'delete') {
        if (!confirm('Delete this project and all its messages?')) return;
        await api.deleteProject(id);
        navigate('/admin/projects');
        return;
      }
      if (action === 'start') await api.startProject(id);
      else if (action === 'pause') await api.pauseProject(id);
      else if (action === 'resume') await api.resumeProject(id);
      else if (action === 'complete') await api.completeProject(id);
      load();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    }
  };

  if (!project) return (
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

  const statusColor = project.status === 'running' ? colors.running
    : project.status === 'completed' ? colors.accent
    : project.status === 'paused' ? colors.creating
    : project.status === 'failed' ? colors.error
    : colors.stopped;

  const isWaitingForUser = project.status === 'paused' && project.pause_reason === 'Waiting for user input';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ ...pixelHeading(), fontSize: 14, marginBottom: 8 }}>{project.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                fontSize: 9,
                fontWeight: 700,
                fontFamily: theme.fonts.heading,
                background: statusColor,
                color: '#fff',
                border: `2px solid ${colors.borderDark}`,
              }}>
                {project.status.toUpperCase()}
              </span>
              <span style={{ color: colors.textLight, fontSize: 12 }}>
                Turn {project.current_turn} / {project.max_turns}
              </span>
            </div>
            {project.pause_reason && project.status === 'paused' && (
              <div style={{
                marginTop: 8,
                padding: '6px 10px',
                fontSize: 11,
                background: isWaitingForUser ? '#e3f2fd' : '#fff3c4',
                border: `2px solid ${isWaitingForUser ? '#42a5f5' : colors.creating}`,
                color: isWaitingForUser ? '#1565c0' : '#6b5900',
                fontWeight: isWaitingForUser ? 700 : 400,
              }}>
                {isWaitingForUser
                  ? 'An agent needs your input. Type your reply below to continue.'
                  : `Paused: ${project.pause_reason}`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
            {(project.status === 'draft' || project.status === 'paused') && project.members?.length > 0 && (
              <DetailBtn label={project.status === 'draft' ? 'Start' : 'Resume'} bg="#4a9e5b"
                onClick={() => handleAction(project.status === 'draft' ? 'start' : 'resume')} />
            )}
            {project.status === 'running' && (
              <DetailBtn label="Pause" bg="#b8860b" onClick={() => handleAction('pause')} />
            )}
            {project.status === 'running' && (
              <DetailBtn label="Complete" bg={colors.accent} onClick={() => handleAction('complete')} />
            )}
            <DetailBtn label="Delete" bg="#c94040" onClick={() => handleAction('delete')} />
          </div>
        </div>

        {/* Goal */}
        {project.goal && (
          <div style={{
            padding: '8px 14px',
            marginTop: 12,
            fontSize: 13,
            color: colors.text,
            background: colors.card,
            border: `2px solid ${colors.border}`,
            lineHeight: 1.6,
          }}>
            <strong style={{ fontSize: 10, fontFamily: theme.fonts.heading }}>Goal: </strong>
            {project.goal}
          </div>
        )}
      </div>

      {/* Slack status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 14px',
        marginBottom: 0,
        fontSize: 12,
        background: colors.card,
        border: `2px solid ${colors.border}`,
        borderBottom: 'none',
      }}>
        {slackStatus?.connected ? (
          <>
            <span style={{ color: colors.running, fontWeight: 700 }}>Slack</span>
            <span style={{ color: colors.text }}>#{slackStatus.channelName}</span>
            {slackStatus.listening && (
              <span style={{ fontSize: 10, color: colors.running }}>listening</span>
            )}
            <a
              href={`https://slack.com/app_redirect?channel=${slackStatus.channelId}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: colors.accent, textDecoration: 'underline', marginLeft: 'auto' }}
            >
              Open in Slack
            </a>
            <button
              onClick={handleSlackDisconnect}
              disabled={slackLoading}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.error}`,
                color: colors.error,
                fontSize: 10,
                padding: '2px 8px',
                cursor: 'pointer',
                fontFamily: theme.fonts.heading,
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <span style={{ color: colors.textLight }}>Slack: not connected</span>
            <button
              onClick={handleSlackConnect}
              disabled={slackLoading}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.accent}`,
                color: colors.accent,
                fontSize: 10,
                padding: '2px 8px',
                cursor: 'pointer',
                fontFamily: theme.fonts.heading,
                marginLeft: 'auto',
              }}
            >
              {slackLoading ? 'Setting up...' : 'Connect Slack'}
            </button>
          </>
        )}
      </div>

      {/* Main layout: sidebar + chat — fills remaining space */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gap: 0,
        border: `2px solid ${colors.borderDark}`,
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Sidebar: members */}
        <div style={{
          padding: 12,
          background: colors.card,
          borderRight: `2px solid ${colors.borderDark}`,
          overflow: 'auto',
        }}>
          <ProjectMemberList project={project} onUpdate={load} />
          <div style={{
            borderTop: `2px solid ${colors.borderDark}`,
            marginTop: 12,
            paddingTop: 12,
          }}>
            <ProjectTaskPanel projectId={project.id} members={project.members || []} />
          </div>
        </div>

        {/* Chat area */}
        <ProjectChat projectId={project.id} projectStatus={project.status} members={project.members} />
      </div>
    </div>
  );
}

function DetailBtn({ label, bg, onClick }: { label: string; bg: string; onClick: () => void }) {
  const { theme } = useTheme();
  return (
    <button onClick={onClick} style={theme.pixelButtonSmall(bg)}>
      {label}
    </button>
  );
}
