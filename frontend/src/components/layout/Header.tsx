import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sun,
  Moon,
  Sparkles,
  Menu,
  Palette,
  Check,
} from 'lucide-react';
import { useTheme, ACCENTS, type AccentColor } from '@/context/ThemeContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your learning journey & study activity' },
  '/materials': { title: 'Study Materials', subtitle: 'Upload and organize lecture notes and PDF textbooks' },
  '/tutor': { title: 'AI Study Workspace', subtitle: 'Ask questions grounded strictly in your course materials' },
  '/quizzes': { title: 'Quiz & Diagnostic Practice', subtitle: 'Test your comprehension and uncover hidden misconceptions' },
  '/knowledge': { title: 'Knowledge Gaps & Revision', subtitle: 'Target weak areas with adaptive revision tasks' },
  '/progress': { title: 'Progress & Analytics', subtitle: 'Measurable mastery trends and verification deltas' },
  '/settings': { title: 'Settings', subtitle: 'Personalize themes, accents, and manage backend connectivity' },
  '/auth': { title: 'Account Access', subtitle: 'Student authentication and session context' },
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const { mode, toggleMode, accent, setAccent } = useTheme();
  const [showAccentPicker, setShowAccentPicker] = useState(false);

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: 'LearnMate',
    subtitle: 'AI Personal Study Companion',
  };

  const accentEntries = Object.entries(ACCENTS) as [AccentColor, typeof ACCENTS[AccentColor]][];

  return (
    <header className="h-16 px-6 glass-nav flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile trigger & Page titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            {pageInfo.title}
          </h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)]">{pageInfo.subtitle}</p>
        </div>
      </div>

      {/* Right: Actions, Theme & Accent Toggles */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Gemini Engine Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-primary)] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini 2.5 Flash</span>
        </div>

        {/* Accent Color Picker Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAccentPicker(!showAccentPicker)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-card)] flex items-center gap-1.5"
            title="Choose Accent Color"
            aria-label="Choose Accent Color"
          >
            <Palette className="w-4 h-4" />
            <span
              className="w-3 h-3 rounded-full border border-black/10 inline-block"
              style={{ backgroundColor: ACCENTS[accent].primary }}
            />
          </button>

          {showAccentPicker && (
            <div
              className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setShowAccentPicker(false)}
            >
              <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Accent Colors
              </div>
              <div className="space-y-1 mt-1">
                {accentEntries.map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAccent(key);
                      setShowAccentPicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      accent === key
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                        style={{ backgroundColor: config.primary }}
                      />
                      <span>{config.label}</span>
                    </div>
                    {accent === key && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleMode}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-card)]"
          title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {mode === 'light' ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
};
