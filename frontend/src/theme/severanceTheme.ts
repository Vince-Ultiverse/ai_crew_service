import type { Theme } from './types';

const colors = {
  background: '#e8ede8',
  sidebar: '#1a2e1a',
  sidebarLight: '#2d4a2d',
  accent: '#2d6a4f',
  accentHover: '#1b4332',
  running: '#40916c',
  stopped: '#8d99ae',
  error: '#d62828',
  creating: '#457b9d',
  card: '#f1f5f1',
  cardHover: '#e8ede8',
  border: '#a3b18a',
  borderDark: '#344e41',
  text: '#1a2e1a',
  textLight: '#6b7b6b',
  textOnDark: '#dad7cd',
  white: '#f1f5f1',
  logBg: '#0a0f0a',
  logText: '#4ade80',
};

export const severanceTheme: Theme = {
  name: 'severance',
  colors,
  fonts: {
    heading: "'Press Start 2P', monospace",
    body: "'Courier New', Courier, monospace",
    mono: "'Courier New', Courier, monospace",
  },
  characterMode: 'pixel',

  statusLabels: {
    running: 'Compliant',
    stopped: 'Dormant',
    error: 'Defiant',
    creating: 'Orienting',
  },

  statusColors: {
    running: { bg: '#d8f3dc', text: '#1b4332', border: colors.running },
    stopped: { bg: '#e0e4e8', text: '#4a5568', border: colors.stopped },
    error: { bg: '#fde8e8', text: '#9b1c1c', border: colors.error },
    creating: { bg: '#dbeafe', text: '#1e3a5f', border: colors.creating },
  },

  labels: {
    appTitle: 'LUMON',
    appSubtitle: 'Macrodata Refinement',
    navDirectory: 'Departments',
    navItems: [
      { path: '/', label: 'Overview', icon: '\u{1F5A5}' },
      { path: '/agents', label: 'Innies', icon: '\u{1F9D1}\u{200D}\u{1F4BC}' },
      { path: '/projects', label: 'Refinements', icon: '\u{1F5C2}' },
      { path: '/templates', label: 'Protocols', icon: '\u{1F4CB}' },
    ],
    pageHeadings: {
      dashboard: 'Department Overview',
      agentList: 'Innie Directory',
      templates: 'Protocol Library',
      agentCreate: 'Onboard Refiner',
      agentEdit: 'Update Personnel',
      projectList: 'Refinement Sessions',
      projectCreate: 'New Refinement',
    },
    dashboardStats: {
      total: 'Personnel',
      running: 'Compliant',
      stopped: 'Dormant',
      error: 'Defiant',
    },
    dashboardIcons: {
      total: '\u{1F4C2}',
      running: '\u{2705}',
      stopped: '\u{26D4}',
      error: '\u{26A0}\u{FE0F}',
    },
    newAgent: '+ Onboard Refiner',
    emptyOffice: 'No personnel on file.',
    hirePrompt: 'Onboard a refiner',
    emptyArchive: 'No protocols on file.',
    newTemplate: '+ New Protocol',
    tabs: { info: 'Personnel Record', logs: 'Activity Log', config: 'Compliance' },
    footer: 'Kier Eagan',
  },

  globalCSS: {
    bodyBackground: colors.background,
    bodyColor: colors.text,
    bodyFont: "'Courier New', Courier, monospace",
    imageRendering: 'pixelated',
    scrollbarTrack: colors.background,
    scrollbarThumb: colors.border,
    scrollbarThumbHover: colors.accent,
    scrollbarBorder: colors.background,
    selectionBg: colors.accent,
    selectionColor: '#fff',
  },

  // Pixel-style functions with Severance colors
  pixelBorder: (color = colors.border) => ({
    border: `3px solid ${color}`,
    borderRadius: 0,
    boxShadow: `4px 4px 0px ${color}`,
  }),

  pixelBorderDark: () => ({
    border: `3px solid ${colors.borderDark}`,
    borderRadius: 0,
    boxShadow: `4px 4px 0px ${colors.borderDark}`,
  }),

  pixelButton: (bg: string, textColor = colors.white) => ({
    padding: '6px 14px',
    background: bg,
    color: textColor,
    border: `3px solid ${colors.borderDark}`,
    borderRadius: 0,
    boxShadow: `3px 3px 0px ${colors.borderDark}`,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Press Start 2P', monospace",
    letterSpacing: 0,
    textTransform: 'uppercase' as const,
    transition: 'transform 0.1s, box-shadow 0.1s',
  }),

  pixelButtonSmall: (bg: string, textColor = colors.white) => ({
    padding: '4px 10px',
    background: bg,
    color: textColor,
    border: `2px solid ${colors.borderDark}`,
    borderRadius: 0,
    boxShadow: `2px 2px 0px ${colors.borderDark}`,
    cursor: 'pointer',
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "'Press Start 2P', monospace",
    textTransform: 'uppercase' as const,
    transition: 'transform 0.1s, box-shadow 0.1s',
  }),

  pixelCard: () => ({
    background: colors.card,
    border: `3px solid ${colors.border}`,
    borderRadius: 0,
    boxShadow: `4px 4px 0px ${colors.border}`,
    padding: 20,
  }),

  pixelInput: () => ({
    width: '100%',
    padding: '8px 12px',
    border: `2px solid ${colors.border}`,
    borderRadius: 0,
    boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.05)',
    fontSize: 14,
    background: '#fff',
    color: colors.text,
    fontFamily: 'inherit',
  }),

  pixelHeading: () => ({
    fontFamily: "'Press Start 2P', monospace",
    color: colors.text,
    letterSpacing: '-0.5px',
    textTransform: 'uppercase' as const,
  }),

  pixelFieldset: () => ({
    border: `2px dashed ${colors.border}`,
    borderRadius: 0,
    padding: 16,
    marginBottom: 16,
  }),

  pixelLegend: () => ({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    padding: '0 8px',
  }),
};
