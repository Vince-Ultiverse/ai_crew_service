import type React from 'react';

export interface ThemeColors {
  background: string;
  sidebar: string;
  sidebarLight: string;
  accent: string;
  accentHover: string;
  running: string;
  stopped: string;
  error: string;
  creating: string;
  card: string;
  cardHover: string;
  border: string;
  borderDark: string;
  text: string;
  textLight: string;
  textOnDark: string;
  white: string;
  logBg: string;
  logText: string;
}

export interface ThemeLabels {
  appTitle: string;
  appSubtitle: string;
  navDirectory: string;
  navItems: { path: string; label: string; icon: string }[];
  pageHeadings: {
    dashboard: string;
    agentList: string;
    templates: string;
    agentCreate: string;
    agentEdit: string;
  };
  dashboardStats: {
    total: string;
    running: string;
    stopped: string;
    error: string;
  };
  dashboardIcons: {
    total: string;
    running: string;
    stopped: string;
    error: string;
  };
  newAgent: string;
  emptyOffice: string;
  hirePrompt: string;
  emptyArchive: string;
  newTemplate: string;
  tabs: { info: string; logs: string; config: string };
  footer: string;
}

export interface Theme {
  name: 'pixel' | 'severance';
  colors: ThemeColors;
  fonts: { heading: string; body: string; mono: string };
  characterMode: 'pixel' | 'corporate';
  statusLabels: Record<string, string>;
  statusColors: Record<string, { bg: string; text: string; border: string }>;
  labels: ThemeLabels;
  globalCSS: {
    bodyBackground: string;
    bodyColor: string;
    bodyFont: string;
    imageRendering: string;
    scrollbarTrack: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
    scrollbarBorder: string;
    selectionBg: string;
    selectionColor: string;
  };
  // Optional CSS background for the main content area
  mainBackground?: string;
  // Style functions
  pixelBorder: (color?: string) => React.CSSProperties;
  pixelBorderDark: () => React.CSSProperties;
  pixelButton: (bg: string, textColor?: string) => React.CSSProperties;
  pixelButtonSmall: (bg: string, textColor?: string) => React.CSSProperties;
  pixelCard: () => React.CSSProperties;
  pixelInput: () => React.CSSProperties;
  pixelHeading: () => React.CSSProperties;
  pixelFieldset: () => React.CSSProperties;
  pixelLegend: () => React.CSSProperties;
}
