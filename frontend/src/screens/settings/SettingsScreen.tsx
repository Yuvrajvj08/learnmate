import React, { useEffect, useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Check,
  Server,
  Cpu,
  RefreshCw,
  AlertTriangle,
  User,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useTheme, ACCENTS, type AccentColor } from '@/context/ThemeContext';
import { useStudent } from '@/context/StudentContext';
import { systemApi } from '@/api/system';
import type { ConfigStatusData, HealthData } from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export const SettingsScreen: React.FC = () => {
  const { mode, setMode, toggleMode, accent, setAccent } = useTheme();
  const { student } = useStudent();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [config, setConfig] = useState<ConfigStatusData | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemData = async () => {
    setLoadingConfig(true);
    setError(null);
    try {
      const [healthData, configData] = await Promise.all([
        systemApi.getHealth().catch(() => null),
        systemApi.getConfigStatus().catch(() => null),
      ]);
      setHealth(healthData);
      setConfig(configData);
    } catch (err: any) {
      setError(err.message || 'Failed to load system diagnostics.');
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo materials, quizzes, and learning analytics?')) {
      return;
    }
    setResettingDemo(true);
    setMessage(null);
    setError(null);
    try {
      const res = await systemApi.resetDemoData();
      setMessage(res.message || 'Demo data successfully reset.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset demo data.');
    } finally {
      setResettingDemo(false);
    }
  };

  const accentEntries = Object.entries(ACCENTS) as [AccentColor, typeof ACCENTS[AccentColor]][];

  return (
    <div className="space-y-6 max-w-4xl">
      {message && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✓ {message}
        </div>
      )}
      {error && <ErrorAlert message={error} onRetry={fetchSystemData} />}

      {/* User Session */}
      <Card>
        <CardHeader
          title="Student Profile"
          subtitle="Active learning session context"
        />
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {student.avatarInitials}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">{student.name}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{student.email}</p>
              <div className="mt-1">
                <Badge variant="accent">Student ID: {student.id}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader
          title="Appearance & Theme"
          subtitle="Personalize your reading comfort and accent color palette"
        />
        <CardContent className="space-y-6">
          {/* Theme Mode Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Color Theme</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Toggle between Light and Dark display modes across the entire platform
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleMode}
                icon={mode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              >
                Switch to {mode === 'dark' ? 'Light' : 'Dark'} Mode
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'light'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent-primary)]/30'
                    : 'border-[var(--border-card)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">Light Mode</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">Clean paper-like readability</span>
                  </div>
                </div>
                {mode === 'light' && <Check className="w-4 h-4 text-[var(--accent-primary)]" />}
              </button>

              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'dark'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent-primary)]/30'
                    : 'border-[var(--border-card)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/60 text-indigo-400 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">Dark Mode</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">Sleek, glare-free night study</span>
                  </div>
                </div>
                {mode === 'dark' && <Check className="w-4 h-4 text-[var(--accent-primary)]" />}
              </button>
            </div>
          </div>

          {/* Accent Color Selection */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Accent Color</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Select one of six curated color palettes to theme buttons, active tabs, and highlights:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accentEntries.map(([key, item]) => {
                const isSelected = accent === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAccent(key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent-primary)]/30'
                        : 'border-[var(--border-card)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">
                        {item.label}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backend & AI Diagnostic Status */}
      <Card>
        <CardHeader
          title="Backend & AI Engine Status"
          subtitle="Verify live connectivity with the FastAPI server and Google GenAI SDK"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSystemData}
              loading={loadingConfig}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Check Now
            </Button>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Backend Server</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Health:</span>
                {health?.status === 'ok' ? (
                  <Badge variant="success">Online (OK)</Badge>
                ) : (
                  <Badge variant="danger">Disconnected</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Database:</span>
                <span className="font-mono text-[var(--text-primary)]">{health?.database || config?.database_status || 'sqlite'}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">AI Model Engine</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Gemini SDK:</span>
                {config?.gemini_configured ? (
                  <Badge variant="success">Configured</Badge>
                ) : (
                  <Badge variant="warning">Offline / Mock Mode</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Active Model:</span>
                <span className="font-mono text-[var(--text-primary)]">{config?.model || 'gemini-2.5-flash'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Reset */}
      <Card>
        <CardHeader
          title="Development & Demo Controls"
          subtitle="Clear seeded questions, uploaded notes, and history for clean demonstration"
        />
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                Reset your student workspace back to clean slate state.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              loading={resettingDemo}
              onClick={handleResetDemo}
              icon={<ShieldAlert className="w-4 h-4" />}
            >
              Reset Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsScreen;
