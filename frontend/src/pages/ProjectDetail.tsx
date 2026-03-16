import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Project } from '../types';
import { api } from '../api/client';
import ProjectChat from '../components/ProjectChat';
import ProjectMemberList from '../components/ProjectMemberList';
import { useTheme } from '../theme';

export default function ProjectDetail() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButtonSmall, pixelHeading } = theme;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api.getProject(id).then(setProject).catch(() => navigate('/projects'));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh project status when running
  useEffect(() => {
    if (!project || project.status !== 'running') return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [project?.status, load]);

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'complete' | 'delete') => {
    if (!id) return;
    try {
      if (action === 'delete') {
        if (!confirm('Delete this project and all its messages?')) return;
        await api.deleteProject(id);
        navigate('/projects');
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
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
              background: '#fff3c4',
              border: `2px solid ${colors.creating}`,
              color: '#6b5900',
            }}>
              Paused: {project.pause_reason}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
          padding: '10px 14px',
          marginBottom: 16,
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

      {/* Main layout: sidebar + chat */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gap: 0,
        border: `2px solid ${colors.borderDark}`,
        overflow: 'hidden',
        height: 'calc(100vh - 280px)',
        minHeight: 400,
      }}>
        {/* Sidebar: members */}
        <div style={{
          padding: 12,
          background: colors.card,
          borderRight: `2px solid ${colors.borderDark}`,
          overflow: 'auto',
        }}>
          <ProjectMemberList project={project} onUpdate={load} />
        </div>

        {/* Chat area */}
        <ProjectChat projectId={project.id} projectStatus={project.status} />
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
