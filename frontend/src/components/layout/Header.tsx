import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Palette, Check } from 'lucide-react';
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
  '/auth': { title: 'Account Access', subtitle: 'Student authentication and session context' },
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const { accent, setAccent } = useTheme();
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: 'LearnMate',
    subtitle: 'AI Personal Study Companion',
  };

  const accentEntries = Object.entries(ACCENTS) as [AccentColor, (typeof ACCENTS)[AccentColor]][];

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAccentPicker(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccentPicker(false);
      }
    };

    if (showAccentPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAccentPicker]);

  return (
    <header className="h-16 px-6 glass-nav flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile trigger & Page titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
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

      {/* Right: Accent Color Picker Dropdown */}
      <div className="flex items-center gap-2" ref={dropdownRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAccentPicker(!showAccentPicker)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-card)] flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Choose accent color"
            aria-label="Choose accent color"
            aria-expanded={showAccentPicker}
            aria-haspopup="true"
          >
            <Palette className="w-4 h-4" />
            <span
              className="w-3 h-3 rounded-full border border-black/10 inline-block shadow-2xs"
              style={{ backgroundColor: ACCENTS[accent]?.primary || ACCENTS.pink.primary }}
            />
          </button>

          {showAccentPicker && (
            <div
              className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              aria-label="Accent colors"
            >
              <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Accent colors
              </div>
              <div className="space-y-1 mt-1">
                {accentEntries.map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccent(key);
                      setShowAccentPicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      accent === key
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs shrink-0"
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
      </div>
    </header>
  );
};

export default Header;
