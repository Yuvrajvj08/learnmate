import React, { createContext, useContext, useEffect, useState } from 'react';

export type AccentColor = 'violet' | 'blue' | 'teal' | 'green' | 'pink' | 'yellow';

export interface AccentConfig {
  id: AccentColor;
  label: string;
  primary: string;
  secondary: string;
  hover: string;
  subtle: string;
  border: string;
  glow: string;
  colorClass: string;
}

export const ACCENTS: Record<AccentColor, AccentConfig> = {
  violet: {
    id: 'violet',
    label: 'Violet',
    primary: '#7C3AED',
    secondary: '#A78BFA',
    hover: '#6D28D9',
    subtle: 'rgba(124, 58, 237, 0.08)',
    border: 'rgba(124, 58, 237, 0.22)',
    glow: 'rgba(124, 58, 237, 0.20)',
    colorClass: 'bg-violet-600',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    primary: '#2563EB',
    secondary: '#60A5FA',
    hover: '#1D4ED8',
    subtle: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.22)',
    glow: 'rgba(37, 99, 235, 0.20)',
    colorClass: 'bg-blue-600',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    primary: '#0D9488',
    secondary: '#2DD4BF',
    hover: '#0F766E',
    subtle: 'rgba(13, 148, 136, 0.08)',
    border: 'rgba(13, 148, 136, 0.22)',
    glow: 'rgba(13, 148, 136, 0.20)',
    colorClass: 'bg-teal-600',
  },
  green: {
    id: 'green',
    label: 'Green',
    primary: '#059669',
    secondary: '#34D399',
    hover: '#047857',
    subtle: 'rgba(5, 150, 105, 0.08)',
    border: 'rgba(5, 150, 105, 0.22)',
    glow: 'rgba(5, 150, 105, 0.20)',
    colorClass: 'bg-emerald-600',
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    primary: '#DB2777',
    secondary: '#F472B6',
    hover: '#BE185D',
    subtle: 'rgba(219, 39, 119, 0.08)',
    border: 'rgba(219, 39, 119, 0.22)',
    glow: 'rgba(219, 39, 119, 0.20)',
    colorClass: 'bg-pink-600',
  },
  yellow: {
    id: 'yellow',
    label: 'Yellow',
    primary: '#D97706',
    secondary: '#FBBF24',
    hover: '#B45309',
    subtle: 'rgba(217, 119, 6, 0.08)',
    border: 'rgba(217, 119, 6, 0.22)',
    glow: 'rgba(217, 119, 6, 0.20)',
    colorClass: 'bg-amber-500',
  },
};

export interface ThemeContextType {
  mode: 'light';
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  accentConfig: AccentConfig;
}

const STORAGE_ACCENT_KEY = 'learnmate_accent_theme';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  accent: 'pink',
  setAccent: () => {},
  accentConfig: ACCENTS.pink,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACCENT_KEY) as AccentColor;
      return saved && ACCENTS[saved] ? saved : 'pink';
    } catch {
      return 'pink';
    }
  });

  const setAccent = (newAccent: AccentColor) => {
    if (!ACCENTS[newAccent]) return;
    setAccentState(newAccent);
    try {
      localStorage.setItem(STORAGE_ACCENT_KEY, newAccent);
    } catch {
      // Storage might be restricted
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    // Always light-only
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');

    const cfg = ACCENTS[accent] || ACCENTS.pink;
    root.setAttribute('data-accent', cfg.id);
    root.style.setProperty('--accent-primary', cfg.primary);
    root.style.setProperty('--accent-secondary', cfg.secondary);
    root.style.setProperty('--accent-hover', cfg.hover);
    root.style.setProperty('--accent-subtle', cfg.subtle);
    root.style.setProperty('--accent-border', cfg.border);
    root.style.setProperty('--accent-glow', cfg.glow);
  }, [accent]);

  return (
    <ThemeContext.Provider
      value={{
        mode: 'light',
        accent,
        setAccent,
        accentConfig: ACCENTS[accent] || ACCENTS.pink,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
