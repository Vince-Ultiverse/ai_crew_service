import { useTheme } from '../theme';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Engineer':        { bg: '#1a2744', text: '#60a5fa', border: '#3b82f6' },
  'Product Manager': { bg: '#2a1f3d', text: '#c084fc', border: '#a855f7' },
  'Designer':        { bg: '#2d1f2e', text: '#f472b6', border: '#ec4899' },
  'Operations':      { bg: '#1f2a1f', text: '#86efac', border: '#22c55e' },
  'Marketing':       { bg: '#2d2a1a', text: '#fbbf24', border: '#f59e0b' },
  'Secretary':       { bg: '#1a2a2a', text: '#5eead4', border: '#14b8a6' },
  'Data Analyst':    { bg: '#1a2035', text: '#7dd3fc', border: '#38bdf8' },
  'QA':              { bg: '#2a2a1a', text: '#bef264', border: '#84cc16' },
  'DevOps':          { bg: '#1a1a2e', text: '#a5b4fc', border: '#818cf8' },
  'HR':              { bg: '#2e1a2a', text: '#f9a8d4', border: '#f472b6' },
  'Finance':         { bg: '#1a2e1a', text: '#6ee7b7', border: '#34d399' },
  'Legal':           { bg: '#2a2420', text: '#fdba74', border: '#fb923c' },
  'Support':         { bg: '#1e2a30', text: '#67e8f9', border: '#22d3ee' },
};

const DEFAULT_COLOR = { bg: '#2a2a2a', text: '#a0a0a0', border: '#666666' };

export const PREDEFINED_ROLES = [
  'Engineer', 'Product Manager', 'Designer', 'Operations', 'Marketing',
  'Secretary', 'Data Analyst', 'QA', 'DevOps', 'HR', 'Finance', 'Legal', 'Support',
];

export default function RoleBadge({ role }: { role: string | null | undefined }) {
  const { theme } = useTheme();
  if (!role) return null;

  const rc = ROLE_COLORS[role] || DEFAULT_COLOR;

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 0,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: theme.fonts.heading,
      background: rc.bg,
      color: rc.text,
      border: `2px solid ${rc.border}`,
      boxShadow: `2px 2px 0px ${theme.colors.border}`,
      letterSpacing: 0,
    }}>
      {role}
    </span>
  );
}
