import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  Info,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useStudent } from '@/context/StudentContext';

export const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const { student } = useStudent();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Do not fake authentication; inform the user and provide access as demo student
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[var(--accent-primary)] text-white items-center justify-center shadow-lg mb-2">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            LearnMate AI
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Personalized, grounded AI study companion
          </p>
        </div>

        {/* Clear Backend Reality Notice */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <Info className="w-4 h-4 shrink-0" />
            <span>Single-student local development mode</span>
          </div>
          <p className="leading-relaxed">
            The LearnMate FastAPI backend currently operates in local student mode using the default context (<code>{student.id}</code>). All REST endpoints under <code>/api/v1</code> are open without auth cookies or bearer tokens.
          </p>
          <p className="text-[11px] text-amber-800/85 italic">
            Production multi-user authentication (Google OAuth 2.0 / JWT) requires a dedicated backend auth route and database user table.
          </p>
        </div>

        {/* Sign In / Sign Up Card */}
        <Card className="shadow-xl">
          <CardContent className="p-6 space-y-5">
            {/* Tab switch */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  authMode === 'signin'
                    ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  authMode === 'signup'
                    ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Alex Johnson"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="demo@learnmate.local"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  size="md"
                  className="w-full"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Enter Workspace as {student.name}
                </Button>
              </div>
            </form>

            <div className="text-center pt-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                Active Session: <strong>{student.id}</strong> (Pre-configured demo context)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
