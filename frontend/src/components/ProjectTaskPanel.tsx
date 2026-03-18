import { useState, useEffect, useCallback } from 'react';
import type { ProjectTask, TaskStatus, ProjectMember } from '../types';
import { api } from '../api/client';
import { useTheme } from '../theme';

interface Props {
  projectId: string;
  members: ProjectMember[];
}

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'not_started', 'completed', 'cancelled'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  in_progress: 'IN PROGRESS',
  not_started: 'TODO',
  completed: 'DONE',
  cancelled: 'CANCELLED',
};

export default function ProjectTaskPanel({ projectId, members }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [showForm, setShowForm] = useState(false);

  const statusColors: Record<TaskStatus, string> = {
    in_progress: colors.running,
    not_started: colors.creating || '#888',
    completed: colors.accent,
    cancelled: colors.stopped,
  };

  const load = useCallback(() => {
    api.getProjectTasks(projectId).then(setTasks).catch(() => {});
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // SSE subscription for real-time updates
  useEffect(() => {
    const evtSource = new EventSource(`/api/projects/${projectId}/tasks/stream`);
    evtSource.onmessage = () => {
      load();
    };
    return () => evtSource.close();
  }, [projectId, load]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.createProjectTask(projectId, {
        title: newTitle.trim(),
        assignee_agent_id: newAssignee || undefined,
      });
      setNewTitle('');
      setNewAssignee('');
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(`Failed to create task: ${e.message}`);
    }
  };

  const handleStatusChange = async (task: ProjectTask, status: TaskStatus) => {
    try {
      await api.updateProjectTask(projectId, task.id, { status });
      load();
    } catch (e: any) {
      alert(`Failed to update task: ${e.message}`);
    }
  };

  const handleDelete = async (task: ProjectTask) => {
    if (!confirm(`Delete task #${task.task_number}: "${task.title}"?`)) return;
    try {
      await api.deleteProjectTask(projectId, task.id);
      load();
    } catch (e: any) {
      alert(`Failed to delete task: ${e.message}`);
    }
  };

  // Group tasks by status
  const grouped = STATUS_ORDER.reduce<Record<TaskStatus, ProjectTask[]>>((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<TaskStatus, ProjectTask[]>);

  const totalTasks = tasks.length;
  const completedTasks = grouped.completed.length;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: theme.fonts.heading,
          fontSize: 9,
          color: colors.text,
          fontWeight: 700,
        }}>
          TASKS {totalTasks > 0 && `(${completedTasks}/${totalTasks})`}
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.accent}`,
            color: colors.accent,
            fontSize: 9,
            padding: '2px 6px',
            cursor: 'pointer',
            fontFamily: theme.fonts.heading,
          }}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <div style={{
          marginBottom: 8,
          padding: 8,
          background: colors.background,
          border: `1px solid ${colors.border}`,
        }}>
          <input
            type="text"
            placeholder="Task title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              width: '100%',
              padding: '4px 6px',
              fontSize: 11,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              marginBottom: 4,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              style={{
                flex: 1,
                padding: '3px 4px',
                fontSize: 10,
                border: `1px solid ${colors.border}`,
                background: colors.card,
                color: colors.text,
              }}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.agent_id} value={m.agent_id}>
                  {m.agent?.name || m.agent_id}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              style={{
                ...theme.pixelButtonSmall(colors.accent),
                fontSize: 8,
                padding: '3px 8px',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 && !showForm && (
        <div style={{ color: colors.textLight, fontSize: 11, textAlign: 'center', padding: 8 }}>
          No tasks yet
        </div>
      )}

      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        return (
          <div key={status} style={{ marginBottom: 6 }}>
            <div style={{
              fontSize: 8,
              fontFamily: theme.fonts.heading,
              color: statusColors[status],
              marginBottom: 3,
              fontWeight: 700,
            }}>
              {STATUS_LABELS[status]} ({group.length})
            </div>
            {group.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                statusColor={statusColors[task.status]}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TaskItem({
  task,
  statusColor,
  onStatusChange,
  onDelete,
}: {
  task: ProjectTask;
  statusColor: string;
  onStatusChange: (task: ProjectTask, status: TaskStatus) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '4px 6px',
      marginBottom: 3,
      background: colors.background,
      borderLeft: `3px solid ${statusColor}`,
      borderTop: `1px solid ${colors.border}`,
      borderRight: `1px solid ${colors.border}`,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <span style={{
          fontSize: 9,
          color: colors.textLight,
          fontFamily: theme.fonts.heading,
          flexShrink: 0,
          marginTop: 1,
        }}>
          #{task.task_number}
        </span>
        <span style={{
          fontSize: 11,
          color: colors.text,
          flex: 1,
          lineHeight: 1.3,
          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          opacity: task.status === 'cancelled' ? 0.5 : 1,
        }}>
          {task.title}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 20 }}>
        {task.assignee_agent?.name && (
          <span style={{
            fontSize: 9,
            color: colors.accent,
            fontWeight: 600,
          }}>
            @{task.assignee_agent.name}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {task.status === 'not_started' && (
            <MiniBtn label="Start" color={colors.running}
              onClick={() => onStatusChange(task, 'in_progress')} />
          )}
          {(task.status === 'not_started' || task.status === 'in_progress') && (
            <MiniBtn label="Done" color={colors.accent}
              onClick={() => onStatusChange(task, 'completed')} />
          )}
          {(task.status === 'completed' || task.status === 'cancelled') && (
            <MiniBtn label="Reopen" color={colors.creating || '#888'}
              onClick={() => onStatusChange(task, 'not_started')} />
          )}
          <MiniBtn label="x" color={colors.error || '#c94040'}
            onClick={() => onDelete(task)} />
        </div>
      </div>
    </div>
  );
}

function MiniBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: `1px solid ${color}`,
        color,
        fontSize: 8,
        padding: '1px 4px',
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}
