import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { api } from '../api/client';
import ProjectCard from '../components/ProjectCard';
import { useTheme } from '../theme';

export default function ProjectList() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButton, pixelHeading, labels } = theme;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: 'start' | 'pause' | 'resume' | 'complete' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm('Delete this project and all its messages?')) return;
        await api.deleteProject(id);
      } else if (action === 'start') {
        await api.startProject(id);
      } else if (action === 'pause') {
        await api.pauseProject(id);
      } else if (action === 'resume') {
        await api.resumeProject(id);
      } else if (action === 'complete') {
        await api.completeProject(id);
      }
      load();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...pixelHeading(), fontSize: 16 }}>
          {labels.pageHeadings.projectList}
        </h1>
        <Link
          to="/projects/new"
          style={{
            ...pixelButton(colors.accent),
            textDecoration: 'none',
            fontSize: 10,
          }}
        >
          + New Project
        </Link>
      </div>

      {loading ? (
        <div style={{
          ...pixelCard(),
          textAlign: 'center',
          fontFamily: theme.fonts.heading,
          fontSize: 10,
          color: colors.textLight,
        }}>
          Loading...
        </div>
      ) : projects.length === 0 ? (
        <div style={{
          ...pixelCard(),
          textAlign: 'center',
          padding: 48,
        }}>
          <div style={{
            fontFamily: theme.fonts.heading,
            fontSize: 11,
            color: colors.textLight,
            marginBottom: 16,
            lineHeight: 2,
          }}>
            No projects yet...
          </div>
          <Link
            to="/projects/new"
            style={{
              ...pixelButton(colors.accent),
              textDecoration: 'none',
              fontSize: 10,
            }}
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
