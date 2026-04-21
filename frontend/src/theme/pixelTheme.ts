import type { Theme } from './types';

const colors = {
  background: '#f0e6d3',
  sidebar: '#5b4a3f',
  sidebarLight: '#7a6555',
  accent: '#7c6fea',
  accentHover: '#6b5dd3',
  running: '#6bcb77',
  stopped: '#a0a0a0',
  error: '#ff6b6b',
  creating: '#ffd93d',
  card: '#fff8ef',
  cardHover: '#fff3e0',
  border: '#c4a882',
  borderDark: '#5b4a3f',
  text: '#3d2e22',
  textLight: '#8a7560',
  textOnDark: '#f0e6d3',
  white: '#fff',
  logBg: '#2a1f14',
  logText: '#d4c4a8',
};

export const pixelTheme: Theme = {
  name: 'pixel',
  colors,
  fonts: {
    heading: "'Press Start 2P', monospace",
    body: "'Courier New', Courier, monospace",
    mono: "'Courier New', Courier, monospace",
  },
  characterMode: 'pixel',

  statusLabels: {
    running: 'Working',
    stopped: 'Resting',
    error: 'SOS!',
    creating: 'Moving in',
  },

  statusColors: {
    running: { bg: '#d4f5d9', text: '#1a5c2a', border: colors.running },
    stopped: { bg: '#e8e8e8', text: '#555', border: colors.stopped },
    error: { bg: '#ffe0e0', text: '#8b1a1a', border: colors.error },
    creating: { bg: '#fff3c4', text: '#6b5900', border: colors.creating },
  },

  labels: {
    appTitle: 'AI Office',
    appSubtitle: 'Crew HQ',
    navDirectory: 'Directory',
    navItems: [
      { path: '/admin', label: 'Lobby', icon: '\u{1F3E2}' },
      { path: '/admin/agents', label: 'Desks', icon: '\u{1FA91}' },
      { path: '/admin/projects', label: 'War Room', icon: '\u{1F4AC}' },
      { path: '/admin/templates', label: 'Archive', icon: '\u{1F4C1}' },
    ],
    pageHeadings: {
      dashboard: 'Office Overview',
      agentList: 'Office Floor',
      templates: 'Templates Archive',
      agentCreate: 'Employee Registration',
      agentEdit: 'Update Profile',
      projectList: 'War Room',
      projectCreate: 'New Mission',
    },
    dashboardStats: {
      total: 'All Staff',
      running: 'On Duty',
      stopped: 'Off Duty',
      error: 'Need Help',
    },
    dashboardIcons: {
      total: '\u{1F465}',
      running: '\u{1F4BB}',
      stopped: '\u{1F634}',
      error: '\u{1F6A8}',
    },
    newAgent: '+ Hire Employee',
    emptyOffice: 'The office is empty...',
    hirePrompt: 'Hire someone!',
    emptyArchive: 'Archive is empty.',
    newTemplate: '+ New Template',
    tabs: { info: 'Personnel File', logs: 'Work Log', config: 'Desk Setup' },
    footer: 'Est. 2024',
  },

  globalCSS: {
    bodyBackground: colors.background,
    bodyColor: colors.text,
    bodyFont: "'Courier New', Courier, monospace",
    imageRendering: 'pixelated',
    scrollbarTrack: colors.background,
    scrollbarThumb: colors.border,
    scrollbarThumbHover: '#a08060',
    scrollbarBorder: colors.background,
    selectionBg: colors.accent,
    selectionColor: '#fff',
  },

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
    background: colors.white,
    color: colors.text,
    fontFamily: 'inherit',
  }),

  pixelHeading: () => ({
    fontFamily: "'Press Start 2P', monospace",
    color: colors.text,
    letterSpacing: '-0.5px',
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
