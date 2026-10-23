import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, User, Plus, Check, ChevronDown, Sun, Moon, Palette } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { useTheme, ACCENTS, type AccentColor } from '@/context/ThemeContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { activeProfile, profiles, setActiveProfile, createProfile } = useProfile();
  const { mode, toggleMode, accent, setAccent } = useTheme();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAccentMenuOpen, setIsAccentMenuOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newLanguage, setNewLanguage] = useState('English');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    setIsCreating(true);
    try {
      await createProfile(newStudentName.trim(), newLanguage);
      setNewStudentName('');
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const navLinks = [
    { to: '/', label: 'Overview' },
    { to: '/dashboard', label: 'My Workspace' },
    { to: '/settings', label: 'AI Integrations' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#090B18]/85 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              <div className="w-full h-full bg-white dark:bg-[#090B18] rounded-[10px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  LearnMate
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/20 dark:border-violet-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Adaptive Learning Companion</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/10 dark:bg-violet-600/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Controls: Theme, Accent, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Accent Theme Picker Popover */}
            <div className="relative">
              <button
                onClick={() => setIsAccentMenuOpen(!isAccentMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Select Accent Color"
                aria-label="Select accent theme"
              >
                <Palette className="w-4 h-4" />
              </button>

              {isAccentMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Accent Theme
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1">
                    {(Object.keys(ACCENTS) as AccentColor[]).map((col) => {
                      const cfg = ACCENTS[col];
                      const isSelected = accent === col;
                      return (
                        <button
                          key={col}
                          onClick={() => {
                            setAccent(col);
                            setIsAccentMenuOpen(false);
                          }}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-400 dark:ring-slate-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                          title={cfg.label}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${cfg.previewClass} shadow-sm`} />
                          <span className="text-[11px] truncate text-slate-700 dark:text-slate-300">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleMode}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme mode"
            >
              {mode === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Profile Dropdown */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-all text-left text-xs cursor-pointer group"
              title="Click to switch or create student profile"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-semibold text-xs shadow">
                {activeProfile?.display_name ? activeProfile.display_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="hidden sm:block">
                <div className="font-medium text-slate-900 dark:text-slate-200 leading-tight">
                  {activeProfile?.display_name || 'Select Student'}
                </div>
                <div className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                  {activeProfile?.preferred_language || 'English'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Switcher & Creator Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Student Profiles"
        subtitle="Active profile used for learning progress and analytics"
      >
        <div className="space-y-6">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
              Existing Local Profiles
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {profiles.map((p) => {
                const isSelected = activeProfile?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProfile(p);
                      setIsProfileModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600/10 dark:bg-violet-600/15 border-violet-500/50 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-600/15 dark:bg-violet-600/20 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold text-sm">
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{p.display_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Language: {p.preferred_language} • Created {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleCreate} className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Create New Profile
            </label>
            <div>
              <input
                type="text"
                placeholder="Student Name (e.g. Maya Chen)"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Preferred Language</label>
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Hinglish">Hinglish</option>
              </select>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreating}
              disabled={!newStudentName.trim()}
              className="w-full"
              icon={<Plus className="w-4 h-4" />}
            >
              Add Student Profile
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
};
