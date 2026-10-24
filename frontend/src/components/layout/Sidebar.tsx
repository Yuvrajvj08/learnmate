import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Bot,
  CheckSquare,
  ListTodo,
  TrendingUp,
  GraduationCap,
  User,
} from 'lucide-react';
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

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/materials', label: 'Study Materials', icon: <FolderOpen className="w-4 h-4" /> },
    { to: '/tutor', label: 'AI Study Workspace', icon: <Bot className="w-4 h-4" /> },
    { to: '/quizzes', label: 'Quiz & Practice', icon: <CheckSquare className="w-4 h-4" /> },
    { to: '/knowledge', label: 'Knowledge & Revision', icon: <ListTodo className="w-4 h-4" /> },
    { to: '/progress', label: 'Progress & Analytics', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <aside
      className={`w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-card)] flex flex-col justify-between shrink-0 h-screen select-none ${className}`}
    >
      {/* Top Header / Logo */}
      <div className="p-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-sm">
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

      {/* Bottom Footer: Compact Student Identity Display */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] text-xs font-bold shrink-0">
            {student.avatarInitials || <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{student.name}</p>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">{student.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
