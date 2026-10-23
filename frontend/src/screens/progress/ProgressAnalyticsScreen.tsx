import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  FolderOpen,
  CheckSquare,
  Clock,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Scale,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { analyticsApi } from '@/api/analytics';
import type { ProgressData, VerificationData } from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { useTheme } from '@/context/ThemeContext';

export const ProgressAnalyticsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { accentConfig } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  // New Verification Modal
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationTopic, setVerificationTopic] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getProgress();
      setProgress(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const handleCreateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationTopic.trim()) return;

    setIsSubmittingVerification(true);
    setError(null);
    try {
      await analyticsApi.createVerification({ topic: verificationTopic.trim() });
      setIsVerificationModalOpen(false);
      setVerificationTopic('');
      await loadProgress();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification tracking.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Compiling verified learning analytics..." size="lg" className="py-20" />;
  }

  const chartData = (progress?.topic_trends || []).map((t) => ({
    name: t.topic,
    accuracy: Math.round(t.accuracy),
    attempts: t.attempts_count,
  }));

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadProgress} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Materials"
          value={progress?.total_materials ?? 0}
          icon={<FolderOpen className="w-5 h-5" />}
          hint="Indexed study sources"
          onClick={() => navigate('/materials')}
        />
        <StatCard
          label="Practice Attempts"
          value={progress?.total_attempts ?? 0}
          icon={<CheckSquare className="w-5 h-5" />}
          hint={`${progress?.questions_answered ?? 0} total questions answered`}
          onClick={() => navigate('/quizzes')}
        />
        <StatCard
          label="Cumulative Accuracy"
          value={`${progress?.average_score ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          hint="Weighted across all quizzes"
        />
        <StatCard
          label="Verifications"
          value={progress?.verifications?.length ?? 0}
          icon={<Scale className="w-5 h-5" />}
          hint="Diagnostic vs follow-up pairs"
        />
      </div>

      {/* Topic Accuracy Chart (Real Recharts visualization) */}
      <Card>
        <CardHeader
          title="Topic Accuracy & Mastery Breakdown"
          subtitle="Real calibration strictly computed from objective student answers"
        />
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-6 h-6" />}
              title="No chart data available"
              description="Complete quizzes to generate topic performance charts."
              actionLabel="Practice Quiz"
              onAction={() => navigate('/quizzes')}
            />
          ) : (
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-[var(--text-secondary)]"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-[var(--text-secondary)]"
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-card)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--card-shadow)',
                    }}
                    formatter={(value: any) => [`${value}%`, 'Accuracy']}
                  />
                  <Bar
                    dataKey="accuracy"
                    fill={accentConfig.primary}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Verification Section */}
      <Card>
        <CardHeader
          title="Measurable Assessment Verifications"
          subtitle="Compare initial diagnostic quiz scores against subsequent follow-up assessments"
          action={
            <Button
              onClick={() => setIsVerificationModalOpen(true)}
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              New Verification
            </Button>
          }
        />
        <CardContent>
          {!progress?.verifications || progress.verifications.length === 0 ? (
            <EmptyState
              icon={<Scale className="w-6 h-6" />}
              title="No verification sessions initiated"
              description="Initiate a verification to scientifically measure your score delta between diagnostic and follow-up practice."
              actionLabel="Initiate Verification"
              onAction={() => setIsVerificationModalOpen(true)}
            />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {progress.verifications.map((v) => {
                const hasScoreDiff = v.score_difference !== null && v.score_difference !== undefined;
                const isPositive = hasScoreDiff && (v.score_difference ?? 0) >= 0;

                return (
                  <div
                    key={v.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{v.topic}</span>
                        <Badge
                          variant={v.status === 'completed' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {v.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{v.message}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Scores display */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                          <span className="text-[10px] text-[var(--text-muted)] block">Initial:</span>
                          <span className="font-bold">
                            {v.initial_score !== null ? `${v.initial_score}%` : 'N/A'}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                          <span className="text-[10px] text-[var(--text-muted)] block">Follow-up:</span>
                          <span className="font-bold">
                            {v.follow_up_score !== null ? `${v.follow_up_score}%` : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {hasScoreDiff && (
                        <div
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {isPositive ? `+${v.score_difference}%` : `${v.score_difference}%`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Verification Modal */}
      <Modal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        title="Initiate Assessment Verification"
        subtitle="Track measurable score gains on a specific curriculum topic"
        maxWidth="md"
      >
        <form onSubmit={handleCreateVerification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Topic Name *
            </label>
            <input
              type="text"
              required
              value={verificationTopic}
              onChange={(e) => setVerificationTopic(e.target.value)}
              placeholder="e.g. Cellular Respiration, Glycolysis"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Links your initial diagnostic quiz on this topic with a subsequent follow-up quiz to measure improvement.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsVerificationModalOpen(false)}
              disabled={isSubmittingVerification}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!verificationTopic.trim() || isSubmittingVerification}
              loading={isSubmittingVerification}
              icon={<Scale className="w-4 h-4" />}
            >
              Start Tracking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
