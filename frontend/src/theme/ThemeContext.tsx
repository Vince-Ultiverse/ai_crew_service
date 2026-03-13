import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Theme } from './types';
import { pixelTheme } from './pixelTheme';
import { severanceTheme } from './severanceTheme';
import { applyGlobalStyles } from './globalStyles';

const STORAGE_KEY = 'ai-crew-theme';

const themes: Record<string, Theme> = {
  pixel: pixelTheme,
  severance: severanceTheme,
};

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && themes[stored]) return themes[stored];
  } catch {}
  return pixelTheme;
}

interface ThemeContextValue {
  theme: Theme;
  themeName: string;
  setThemeName: (name: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyGlobalStyles(current);
    try {
      localStorage.setItem(STORAGE_KEY, current.name);
    } catch {}
  }, [current]);

  const setThemeName = (name: string) => {
    if (themes[name]) setCurrent(themes[name]);
  };

  const toggleTheme = () => {
    setCurrent((prev) => (prev.name === 'pixel' ? severanceTheme : pixelTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme: current, themeName: current.name, setThemeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
