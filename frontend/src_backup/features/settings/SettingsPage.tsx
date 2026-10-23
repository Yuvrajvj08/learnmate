import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Server,
  Database,
  Radio,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Palette,
  Check,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { integrationsApi, type BackendHealthResponse, type BackendConfigStatus } from '@/api/integrations';
import { useTheme, ACCENTS, type AccentColor } from '@/context/ThemeContext';
import type { ProviderStatus, TestConnectionResult } from '@/types';

export const SettingsPage: React.FC = () => {
  const { mode, toggleMode, accent, setAccent } = useTheme();

  const [healthInfo, setHealthInfo] = useState<BackendHealthResponse | null>(null);
  const [configInfo, setConfigInfo] = useState<BackendConfigStatus | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestConnectionResult>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, cRes] = await Promise.allSettled([
        integrationsApi.getHealth(),
        integrationsApi.getConfigStatus(),
      ]);

      if (hRes.status === 'fulfilled') {
        setHealthInfo(hRes.value);
      }
      if (cRes.status === 'fulfilled') {
        const cfg = cRes.value;
        setConfigInfo(cfg);
        setProviders([
          {
            provider_id: 'gemini',
            name: 'Google Gemini',
            configured_model: cfg.default_model || 'gemini-2.5-flash',
            status: cfg.gemini_api_key_configured ? 'Connected' : 'Missing Key',
            is_configured: cfg.gemini_api_key_configured,
            masked_key: cfg.gemini_api_key_configured ? '••••••••••••••••' : 'Not set in backend .env',
            supported_capabilities: [
              'grounded_qna',
              'quiz_generation',
              'misconception_analysis',
              'revision_planning',
            ],
          },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load integrations status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    const start = performance.now();
    try {
      const health = await integrationsApi.getHealth();
      const latency = Math.round(performance.now() - start);
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          provider_id: providerId,
          success: health.status === 'ok',
          message: `Backend connected successfully. Database status: ${health.database} (Verified in ${latency}ms)`,
          latency_ms: latency,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          provider_id: providerId,
          success: false,
          message: err.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset local demo dataset? This restores the standard student benchmark records.')) {
      return;
    }
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await integrationsApi.resetDemo();
      setResetMessage(res.message || 'Demo data reset successfully.');
      fetchData();
    } catch (err: any) {
      setResetMessage(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                AI Integrations & System Settings
              </h1>
              <Badge variant="violet" size="sm">
                Live Status
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Inspect backend connection health, configure Gemini AI, and customize visual themes.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            isLoading={loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Diagnostics
          </Button>
        </div>

        {/* Visual Appearance & Theme Controls */}
        <Card className="p-6 bg-white dark:bg-[#141836] border border-slate-200 dark:border-white/[0.08] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Visual Appearance & Theme Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch between Light & Dark modes and choose from 6 accent color palettes.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={toggleMode}
              icon={mode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            >
              {mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </Button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
              Accent Palette (Current: <span className="capitalize text-slate-900 dark:text-white font-bold">{accent}</span>)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {(Object.keys(ACCENTS) as AccentColor[]).map((col) => {
                const cfg = ACCENTS[col];
                const isSelected = accent === col;
                return (
                  <button
                    key={col}
                    onClick={() => setAccent(col)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 ring-2 ring-violet-500/20 bg-violet-500/10 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-4 h-4 rounded-full ${cfg.previewClass} shadow-sm`} />
                      <span>{cfg.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* System Architecture Diagnostic Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-white dark:bg-[#141836] border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Active Backend API</span>
              <Server className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {configInfo?.app_name || 'FastAPI Local Engine'}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{healthInfo?.status === 'ok' ? 'Operational (Port 8000)' : 'Connecting...'}</span>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-[#141836] border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Local Persistence</span>
              <Database className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">SQLite + SQLAlchemy</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
              Status: {healthInfo?.database || 'connected'}
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-[#141836] border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Study Ingestion</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">PyMuPDF Engine</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Max {configInfo?.upload_max_file_size_mb || 25} MB • PDF & Text Notes
            </div>
          </Card>
        </div>

        {/* AI Providers Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            Configured AI Model Providers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {providers.map((p) => {
              const testResult = testResults[p.provider_id];
              const isGemini = p.provider_id === 'gemini';

              return (
                <Card
                  key={p.provider_id}
                  className={`p-6 space-y-4 bg-white dark:bg-[#141836] border ${
                    isGemini
                      ? 'border-violet-500/40 shadow-lg shadow-violet-500/5'
                      : 'border-slate-200 dark:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.name}</h3>
                        {isGemini && (
                          <Badge variant="cyan" size="sm">
                            Primary Provider
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        Model: {p.configured_model || 'Default'}
                      </p>
                    </div>

                    <Badge
                      variant={
                        p.status === 'Connected'
                          ? 'emerald'
                          : p.is_configured
                          ? 'violet'
                          : 'slate'
                      }
                      size="sm"
                    >
                      {p.status}
                    </Badge>
                  </div>

                  {/* Masked API Key status */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Environment Credential:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold">
                      {p.masked_key || 'Not set in backend .env'}
                    </span>
                  </div>

                  {/* Supported Capabilities */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                      Supported Capabilities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.supported_capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                        >
                          {cap.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Test Connection Button & Result */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant={isGemini ? 'primary' : 'secondary'}
                        isLoading={testingId === p.provider_id}
                        onClick={() => handleTestConnection(p.provider_id)}
                        icon={<Zap className="w-3.5 h-3.5" />}
                      >
                        Verify Live Connection
                      </Button>

                      {testResult && (
                        <span
                          className={`text-xs flex items-center gap-1.5 font-medium ${
                            testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          }`}
                        >
                          {testResult.success ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {testResult.latency_ms ? `${testResult.latency_ms}ms` : ''}
                        </span>
                      )}
                    </div>

                    {testResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          testResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {testResult.message}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Demo Data Management */}
        <Card className="p-6 bg-white dark:bg-[#141836] border border-slate-200 dark:border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Demo Benchmark Dataset
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Reset or reseed the sample learning materials, diagnostic attempts, and revision plans.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              isLoading={isResetting}
              onClick={handleResetDemoData}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Reset Demo Dataset
            </Button>
          </div>

          {resetMessage && (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-800 dark:text-violet-300">
              {resetMessage}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
