import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Bot,
  CheckSquare,
  ListTodo,
  TrendingUp,
  Settings,
  GraduationCap,
  Wifi,
  WifiOff,
  User,
} from 'lucide-react';
import { systemApi } from '@/api/system';
import { useStudent } from '@/context/StudentContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export const Sidebar: React.FC<{ className?: string; onClose?: () => void }> = ({
  className = '',
  onClose,
}) => {
  const { student } = useStudent();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const res = await systemApi.getHealth();
        if (isMounted) setIsBackendHealthy(res.status === 'ok');
      } catch {
        if (isMounted) setIsBackendHealthy(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 20000); // Check every 20 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/materials', label: 'Study Materials', icon: <FolderOpen className="w-4 h-4" /> },
    { to: '/tutor', label: 'AI Study Workspace', icon: <Bot className="w-4 h-4" /> },
    { to: '/quizzes', label: 'Quiz & Practice', icon: <CheckSquare className="w-4 h-4" /> },
    { to: '/knowledge', label: 'Knowledge & Revision', icon: <ListTodo className="w-4 h-4" /> },
    { to: '/progress', label: 'Progress & Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside
      className={`w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-card)] flex flex-col justify-between shrink-0 h-screen select-none ${className}`}
    >
      {/* Top Header / Logo */}
      <div className="p-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
                LearnMate
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[var(--accent-subtle)] text-[var(--accent-primary)] uppercase tracking-wider">
                AI
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">Personal Study Companion</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 overflow-y-auto flex-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Study Portal
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`
            }
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Footer: Backend Connectivity & Active Student */}
      <div className="p-4 border-t border-[var(--border-subtle)] space-y-3 bg-[var(--bg-secondary)]/30">
        {/* Backend Connection Indicator */}
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy === null
                  ? 'bg-amber-400 animate-pulse'
                  : isBackendHealthy
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-medium text-[var(--text-secondary)] text-[11px]">
              {isBackendHealthy === null
                ? 'Connecting backend...'
                : isBackendHealthy
                ? 'Backend Connected'
                : 'Backend Disconnected'}
            </span>
          </div>
          {isBackendHealthy ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>

        {/* Active Student Pill */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] text-xs font-bold shrink-0">
            {student.avatarInitials || <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{student.name}</p>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">{student.id}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
