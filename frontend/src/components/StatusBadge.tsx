import { useTheme } from '../theme';

export default function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const { colors, statusColors, statusLabels } = theme;
  const sc = statusColors[status] || statusColors.stopped;
  const label = statusLabels[status] || status;

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 0,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: theme.fonts.heading,
      background: sc.bg,
      color: sc.text,
      border: `2px solid ${sc.border}`,
      boxShadow: `2px 2px 0px ${colors.border}`,
      letterSpacing: 0,
    }}>
      {label}
    </span>
  );
}
