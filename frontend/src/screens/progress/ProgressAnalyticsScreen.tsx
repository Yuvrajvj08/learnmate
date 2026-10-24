import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  FolderOpen,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Plus,
  Scale,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { analyticsApi } from '@/api/analytics';
import { revisionApi } from '@/api/revision';
import type { ProgressData, RevisionTaskItem } from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';

export const ProgressAnalyticsScreen: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [nextRevisionTask, setNextRevisionTask] = useState<RevisionTaskItem | null>(null);

  // New Verification Modal
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationTopic, setVerificationTopic] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, planRes] = await Promise.all([
        analyticsApi.getProgress(),
        revisionApi.getPlan().catch(() => null),
      ]);
      setProgress(progRes);

      if (planRes && planRes.tasks) {
        const pending = planRes.tasks.find((t) => t.status !== 'completed');
        setNextRevisionTask(pending || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load progress analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationTopic.trim()) return;

    setIsSubmittingVerification(true);
    setError(null);
    try {
      await analyticsApi.createVerification({ topic: verificationTopic.trim() });
      setIsVerificationModalOpen(false);
      setVerificationTopic('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification tracking.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  // Up to 5 weakest topics, sorted from weakest to strongest (lowest accuracy first)
  const weakestTopics = useMemo(() => {
    const topics = progress?.topic_trends || [];
    return [...topics]
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)
      .map((t) => ({
        topic: t.topic,
        displayName: t.topic.length > 22 ? `${t.topic.slice(0, 20)}...` : t.topic,
        accuracy: Math.round(t.accuracy),
        attempts: t.attempts_count,
        status: t.status,
      }));
  }, [progress]);

  // Weak topics remaining: topics with status === 'weak' or accuracy < 50%
  const weakTopicsCount = useMemo(() => {
    const topics = progress?.topic_trends || [];
    return topics.filter((t) => t.status === 'weak' || t.accuracy < 50).length;
  }, [progress]);

  // Next best action data
  const nextAction = useMemo(() => {
    if (nextRevisionTask) {
      return {
        title: nextRevisionTask.title,
        description: nextRevisionTask.suggested_activity,
        badge: `${nextRevisionTask.priority} priority`,
        badgeVariant:
          nextRevisionTask.priority === 'high'
            ? 'danger'
            : nextRevisionTask.priority === 'medium'
            ? 'warning'
            : 'neutral',
        buttonText: 'Start revision',
        onClick: () => {
          const act = (nextRevisionTask.suggested_activity || '').toLowerCase();
          if (act.includes('tutor') || act.includes('ask')) {
            navigate('/tutor', {
              state: {
                initialPrompt: `Help me with revision for "${nextRevisionTask.topic}": ${nextRevisionTask.title}`,
              },
            });
          } else {
            navigate('/quizzes', { state: { topic: nextRevisionTask.topic } });
          }
        },
      };
    }

    if (weakestTopics.length > 0) {
      const weakest = weakestTopics[0];
      return {
        title: `Practice "${weakest.topic}"`,
        description: `Current accuracy is ${weakest.accuracy}%. Take a short quiz to reinforce concepts and close gaps.`,
        badge: `${weakest.accuracy}% accuracy`,
        badgeVariant: 'danger' as const,
        buttonText: 'Practice quiz',
        onClick: () => navigate('/quizzes', { state: { topic: weakest.topic } }),
      };
    }

    return {
      title: 'Ready for a new study session',
      description: 'Upload study notes or run a diagnostic quiz to calibrate your knowledge profile.',
      badge: 'Up to date',
      badgeVariant: 'success' as const,
      buttonText: 'Study materials',
      onClick: () => navigate('/materials'),
    };
  }, [nextRevisionTask, weakestTopics, navigate]);

  if (loading) {
    return <LoadingSpinner label="Compiling learning analytics..." size="lg" className="py-20" />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total materials"
          value={progress?.total_materials ?? 0}
          icon={<FolderOpen className="w-5 h-5 text-[var(--accent-primary)]" />}
          hint="Indexed study sources"
          onClick={() => navigate('/materials')}
        />
        <StatCard
          label="Practice attempts"
          value={progress?.total_attempts ?? 0}
          icon={<CheckSquare className="w-5 h-5 text-[var(--accent-primary)]" />}
          hint={`${progress?.questions_answered ?? 0} total questions answered`}
          onClick={() => navigate('/quizzes')}
        />
        <StatCard
          label="Average Quiz Score"
          value={`${progress?.average_score ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-[var(--accent-primary)]" />}
          hint="Average across quiz attempts"
        />
        <StatCard
          label="Weak topics remaining"
          value={weakTopicsCount}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          hint="Topics scoring below 50%"
        />
      </div>

      {/* Next Best Action Card */}
      <div className="p-5 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-primary)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next best action</span>
            </span>
            <Badge variant={nextAction.badgeVariant as any} size="sm">
              {nextAction.badge}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {nextAction.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            {nextAction.description}
          </p>
        </div>

        <Button
          onClick={nextAction.onClick}
          variant="primary"
          size="sm"
          className="shrink-0 self-start sm:self-center"
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          {nextAction.buttonText}
        </Button>
      </div>

      {/* Weakest Topics Horizontal Chart */}
      <Card>
        <CardHeader
          title="Weakest topics breakdown"
          subtitle="Up to five topics needing the most focus, sorted from weakest to strongest"
          action={
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Weak (&lt;50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Developing (50–74%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Strong (≥75%)</span>
              </div>
            </div>
          }
        />
        <CardContent>
          {weakestTopics.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-6 h-6" />}
              title="No topic performance data available"
              description="Complete quizzes to generate topic performance charts and identify focus areas."
              actionLabel="Practice quiz"
              onAction={() => navigate('/quizzes')}
            />
          ) : (
            <div className="w-full pt-2">
              <ResponsiveContainer width="100%" height={Math.max(180, weakestTopics.length * 46 + 40)}>
                <BarChart
                  layout="vertical"
                  data={weakestTopics}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={140}
                    tick={{ fontSize: 12, fill: 'var(--text-primary)' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md text-xs space-y-1">
                            <p className="font-semibold text-[var(--text-primary)]">{data.topic}</p>
                            <p className="text-[var(--text-secondary)]">
                              Accuracy: <span className="font-bold text-[var(--text-primary)]">{data.accuracy}%</span>
                            </p>
                            <p className="text-[var(--text-muted)] text-[11px]">
                              {data.attempts} practice attempt(s)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} barSize={20}>
                    {weakestTopics.map((entry, index) => {
                      const color =
                        entry.accuracy < 50
                          ? '#EF4444' // Rose / Red for weak
                          : entry.accuracy < 75
                          ? '#F59E0B' // Amber for developing
                          : '#10B981'; // Emerald for strong
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Verification Section */}
      <Card>
        <CardHeader
          title="Assessment verifications"
          subtitle="Compare initial diagnostic quiz scores against subsequent follow-up assessments"
          action={
            <Button
              onClick={() => setIsVerificationModalOpen(true)}
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              New verification
            </Button>
          }
        />
        <CardContent>
          {!progress?.verifications || progress.verifications.length === 0 ? (
            <EmptyState
              icon={<Scale className="w-6 h-6" />}
              title="No verification sessions initiated"
              description="Initiate a verification to track score deltas between diagnostic and follow-up practice."
              actionLabel="Initiate verification"
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
                        <span className="font-semibold text-sm text-[var(--text-primary)]">{v.topic}</span>
                        <Badge
                          variant={v.status === 'completed' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {v.status === 'completed' ? 'Completed' : 'Awaiting follow-up'}
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
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
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
        title="Initiate assessment verification"
        subtitle="Track measurable score gains on a specific curriculum topic"
        maxWidth="md"
      >
        <form onSubmit={handleCreateVerification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Topic name *
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
              Start tracking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
