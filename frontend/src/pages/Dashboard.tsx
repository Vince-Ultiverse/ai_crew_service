import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '../types';
import { api } from '../api/client';
import { useTheme } from '../theme';

export default function Dashboard() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelButton, pixelHeading, labels } = theme;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return (
    <div style={{
      ...pixelCard(),
      color: colors.error,
      fontFamily: theme.fonts.heading,
      fontSize: 10,
    }}>
      Failed to load stats: {error}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...pixelHeading(), fontSize: 16 }}>
          {labels.pageHeadings.dashboard}
        </h1>
        <Link
          to="/agents/new"
          style={{
            ...pixelButton(colors.accent),
            textDecoration: 'none',
            fontSize: 10,
          }}
        >
          {labels.newAgent}
        </Link>
      </div>

      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label={labels.dashboardStats.total} value={stats.total} color={colors.accent} icon={labels.dashboardIcons.total} />
          <StatCard label={labels.dashboardStats.running} value={stats.running} color={colors.running} icon={labels.dashboardIcons.running} />
          <StatCard label={labels.dashboardStats.stopped} value={stats.stopped} color={colors.stopped} icon={labels.dashboardIcons.stopped} />
          <StatCard label={labels.dashboardStats.error} value={stats.error} color={colors.error} icon={labels.dashboardIcons.error} />
        </div>
      ) : (
        <div style={{
          ...pixelCard(),
          textAlign: 'center',
          fontFamily: theme.fonts.heading,
          fontSize: 10,
          color: colors.textLight,
        }}>
          Loading...
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const { theme } = useTheme();
  const { colors, pixelCard } = theme;
  return (
    <div style={{
      ...pixelCard(),
      textAlign: 'center',
      padding: 20,
    }}>
      {icon && <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color,
        fontFamily: theme.fonts.heading,
        marginBottom: 8,
      }}>{value}</div>
      <div style={{
        fontSize: 9,
        color: colors.textLight,
        fontFamily: theme.fonts.heading,
      }}>{label}</div>
    </div>
  );
}
