import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'violet' | 'blue' | 'teal' | 'green' | 'pink' | 'yellow';

export interface AccentConfig {
  id: AccentColor;
  label: string;
  primary: string;
  secondary: string;
  glow: string;
  previewClass: string;
}

export const ACCENTS: Record<AccentColor, AccentConfig> = {
  violet: {
    id: 'violet',
    label: 'Violet',
    primary: '#7c3aed',
    secondary: '#a78bfa',
    glow: 'rgba(124, 58, 237, 0.35)',
    previewClass: 'bg-violet-600',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    primary: '#2563eb',
    secondary: '#60a5fa',
    glow: 'rgba(37, 99, 235, 0.35)',
    previewClass: 'bg-blue-600',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    primary: '#0d9488',
    secondary: '#2dd4bf',
    glow: 'rgba(13, 148, 136, 0.35)',
    previewClass: 'bg-teal-600',
  },
  green: {
    id: 'green',
    label: 'Green',
    primary: '#059669',
    secondary: '#34d399',
    glow: 'rgba(5, 150, 105, 0.35)',
    previewClass: 'bg-emerald-600',
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    primary: '#db2777',
    secondary: '#f472b6',
    glow: 'rgba(219, 39, 119, 0.35)',
    previewClass: 'bg-pink-600',
  },
  yellow: {
    id: 'yellow',
    label: 'Yellow',
    primary: '#d97706',
    secondary: '#fbbf24',
    glow: 'rgba(217, 119, 6, 0.35)',
    previewClass: 'bg-amber-500',
  },
};

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setAccent: (accent: AccentColor) => void;
  accentConfig: AccentConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_THEME_KEY = 'learnmate_theme_mode';
const STORAGE_ACCENT_KEY = 'learnmate_accent_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    // Light mode by default per requirement
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem(STORAGE_ACCENT_KEY) as AccentColor;
    return saved && ACCENTS[saved] ? saved : 'violet';
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_THEME_KEY, newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    localStorage.setItem(STORAGE_ACCENT_KEY, newAccent);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    const cfg = ACCENTS[accent];
    root.setAttribute('data-accent', accent);
    root.style.setProperty('--accent-primary', cfg.primary);
    root.style.setProperty('--accent-secondary', cfg.secondary);
    root.style.setProperty('--accent-glow', cfg.glow);
  }, [mode, accent]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        setMode,
        toggleMode,
        setAccent,
        accentConfig: ACCENTS[accent],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
