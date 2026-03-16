import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { useTheme } from '../theme';

const STATUS_EMOJI: Record<string, string> = {
  draft: '\u{1F4DD}',
  running: '\u{1F680}',
  paused: '\u{23F8}\u{FE0F}',
  completed: '\u{2705}',
  failed: '\u{274C}',
};

export default function ProjectCard({ project, onAction }: {
  project: Project;
  onAction: (id: string, action: 'start' | 'pause' | 'resume' | 'complete' | 'delete') => void;
}) {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButtonSmall, pixelHeading } = theme;

  const progress = project.max_turns > 0
    ? Math.round((project.current_turn / project.max_turns) * 100)
    : 0;

  return (
    <div style={{
      ...pixelCard(),
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 24 }}>{STATUS_EMOJI[project.status] || '\u{1F4CB}'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={`/projects/${project.id}`}
            style={{
              ...pixelHeading(),
              fontSize: 11,
              display: 'block',
              textDecoration: 'none',
              marginBottom: 6,
              lineHeight: 1.5,
            }}
          >
            {project.name}
          </Link>
          <div style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 9,
            fontWeight: 700,
            fontFamily: theme.fonts.heading,
            background: project.status === 'running' ? colors.running
              : project.status === 'completed' ? colors.accent
              : project.status === 'paused' ? colors.creating
              : project.status === 'failed' ? colors.error
              : colors.stopped,
            color: '#fff',
            border: `2px solid ${colors.borderDark}`,
          }}>
            {project.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{
        fontSize: 12,
        color: colors.textLight,
        background: colors.background,
        padding: '8px 10px',
        border: `2px solid ${colors.border}`,
      }}>
        {project.goal && (
          <div style={{ marginBottom: 4, color: colors.text, fontSize: 12 }}>
            {project.goal.length > 80 ? project.goal.slice(0, 80) + '...' : project.goal}
          </div>
        )}
        <div>Members: {project.members?.length || 0}</div>
        <div>Turns: {project.current_turn} / {project.max_turns}</div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 8,
        background: colors.border,
        border: `2px solid ${colors.borderDark}`,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: project.status === 'completed' ? colors.accent : colors.running,
          transition: 'width 0.3s',
        }} />
      </div>

      {/* Member avatars */}
      {project.members?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {project.members.slice(0, 6).map((m) => (
            <div key={m.id} style={{
              padding: '2px 6px',
              fontSize: 9,
              background: m.agent_id === project.current_agent_id ? colors.running : colors.card,
              border: `1px solid ${m.agent_id === project.current_agent_id ? colors.running : colors.border}`,
              color: colors.text,
              fontFamily: theme.fonts.mono,
            }}>
              {m.agent?.name || 'Unknown'}
            </div>
          ))}
          {project.members.length > 6 && (
            <span style={{ fontSize: 9, color: colors.textLight }}>+{project.members.length - 6}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(project.status === 'draft' || project.status === 'paused') && (
          <ActionBtn label={project.status === 'draft' ? 'Start' : 'Resume'} bg="#4a9e5b"
            onClick={() => onAction(project.id, project.status === 'draft' ? 'start' : 'resume')} theme={theme} />
        )}
        {project.status === 'running' && (
          <ActionBtn label="Pause" bg="#b8860b" onClick={() => onAction(project.id, 'pause')} theme={theme} />
        )}
        {project.status === 'running' && (
          <ActionBtn label="Complete" bg={colors.accent} onClick={() => onAction(project.id, 'complete')} theme={theme} />
        )}
        <ActionBtn label="Delete" bg="#c94040" onClick={() => onAction(project.id, 'delete')} theme={theme} />
      </div>
    </div>
  );
}

function ActionBtn({ label, bg, onClick, theme }: { label: string; bg: string; onClick: () => void; theme: any }) {
  return (
    <button onClick={onClick} style={theme.pixelButtonSmall(bg)}>
      {label}
    </button>
  );
}
