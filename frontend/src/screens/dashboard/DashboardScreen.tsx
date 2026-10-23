import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Bot,
  CheckSquare,
  ListTodo,
  TrendingUp,
  FileText,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { materialsApi } from '@/api/materials';
import { analyticsApi } from '@/api/analytics';
import { revisionApi } from '@/api/revision';
import type {
  MaterialData,
  ProgressData,
  RevisionPlanData,
  KnowledgeGapItem,
} from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { useStudent } from '@/context/StudentContext';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { student } = useStudent();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlanData | null>(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGapItem[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matRes, progRes, revRes, gapsRes] = await Promise.all([
        materialsApi.list(5, 0).catch(() => ({ materials: [], total: 0 })),
        analyticsApi.getProgress().catch(() => null),
        revisionApi.getPlan().catch(() => null),
        analyticsApi.getKnowledgeGaps().catch(() => ({ topics: [], total_topics: 0 })),
      ]);

      setMaterials(matRes.materials || []);
      setProgress(progRes);
      setRevisionPlan(revRes);
      setKnowledgeGaps(gapsRes.topics || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await revisionApi.updateTaskStatus(taskId, nextStatus as any);
      // Refresh plan
      const updated = await revisionApi.getPlan();
      setRevisionPlan(updated);
    } catch {
      // Ignore or log error
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your personalized study overview..." size="lg" className="py-20" />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadDashboardData} />}

      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)] text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Active Learning Session</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {student.name}
          </h2>
          <p className="text-sm sm:text-base text-white/85 mt-2 leading-relaxed">
            Your personal AI study companion is ready. Upload lecture notes, ask grounded questions, and test your knowledge against verified source materials.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Button
              onClick={() => navigate('/materials')}
              variant="secondary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              className="bg-white text-[var(--accent-primary)] hover:bg-white/90 border-transparent shadow-md"
            >
              Upload Material
            </Button>
            <Button
              onClick={() => navigate('/tutor')}
              variant="outline"
              size="md"
              icon={<Bot className="w-4 h-4" />}
              className="text-white border-white/40 hover:bg-white/10 hover:border-white"
            >
              Ask AI Tutor
            </Button>
            <Button
              onClick={() => navigate('/quizzes')}
              variant="outline"
              size="md"
              icon={<CheckSquare className="w-4 h-4" />}
              className="text-white border-white/40 hover:bg-white/10 hover:border-white"
            >
              Practice Quiz
            </Button>
          </div>
        </div>

        {/* Decorative backdrop shapes */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-12 w-48 h-48 rounded-full bg-black/10 blur-xl pointer-events-none" />
      </div>

      {/* Live Metric Cards based on REAL backend data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Study Materials"
          value={progress?.total_materials ?? materials.length}
          icon={<FolderOpen className="w-5 h-5" />}
          hint="Indexed PDF documents & notes"
          onClick={() => navigate('/materials')}
        />
        <StatCard
          label="Quizzes Taken"
          value={progress?.total_attempts ?? 0}
          icon={<CheckSquare className="w-5 h-5" />}
          hint={`${progress?.questions_answered ?? 0} questions answered`}
          onClick={() => navigate('/quizzes')}
        />
        <StatCard
          label="Average Score"
          value={`${progress?.average_score ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          hint={progress?.total_attempts ? 'Calculated across all attempts' : 'Take a quiz to calculate'}
          onClick={() => navigate('/progress')}
        />
        <StatCard
          label="Pending Tasks"
          value={revisionPlan?.pending_tasks ?? 0}
          icon={<ListTodo className="w-5 h-5" />}
          hint={`${revisionPlan?.completed_tasks ?? 0} completed so far`}
          onClick={() => navigate('/knowledge')}
        />
      </div>

      {/* Two-Column Grid: Core Workspaces & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Materials & Priority Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Study Materials Card */}
          <Card>
            <CardHeader
              title="Recent Study Materials"
              subtitle="Quickly access uploaded resources or start grounded Q&A"
              action={
                <Button
                  onClick={() => navigate('/materials')}
                  variant="ghost"
                  size="sm"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  View Library
                </Button>
              }
            />
            <CardContent>
              {materials.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen className="w-6 h-6" />}
                  title="No study materials yet"
                  description="Upload your first textbook chapter or paste study notes to get started."
                  actionLabel="Upload Material"
                  onAction={() => navigate('/materials')}
                />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-[var(--bg-card-hover)] px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {m.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-secondary)]">
                            <Badge variant={m.material_type === 'pdf' ? 'accent' : 'neutral'} size="sm">
                              {m.material_type.toUpperCase()}
                            </Badge>
                            <span>•</span>
                            <span>{m.page_count} {m.page_count === 1 ? 'page' : 'pages'}</span>
                            <span>•</span>
                            <span>{m.char_count.toLocaleString()} chars</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => navigate('/tutor', { state: { materialId: m.id } })}
                          variant="outline"
                          size="sm"
                          icon={<Bot className="w-3.5 h-3.5" />}
                        >
                          Ask Tutor
                        </Button>
                        <Button
                          onClick={() => navigate('/quizzes', { state: { materialId: m.id, topic: m.title } })}
                          variant="ghost"
                          size="sm"
                          icon={<CheckSquare className="w-3.5 h-3.5" />}
                        >
                          Quiz
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Revision Recommendations */}
          <Card>
            <CardHeader
              title="Adaptive Revision Recommendations"
              subtitle="Prioritized tasks generated from your actual quiz weaknesses"
              action={
                <Button
                  onClick={() => navigate('/knowledge')}
                  variant="ghost"
                  size="sm"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  All Tasks
                </Button>
              }
            />
            <CardContent>
              {!revisionPlan || revisionPlan.tasks.length === 0 ? (
                <EmptyState
                  icon={<ListTodo className="w-6 h-6" />}
                  title="No pending revision tasks"
                  description="Complete a practice quiz to generate personalized recommendations."
                  actionLabel="Take a Quiz"
                  onAction={() => navigate('/quizzes')}
                />
              ) : (
                <div className="space-y-3">
                  {revisionPlan.tasks.slice(0, 4).map((task) => {
                    const isCompleted = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          isCompleted
                            ? 'bg-[var(--bg-secondary)]/40 border-[var(--border-card)] opacity-60'
                            : 'bg-[var(--bg-card)] border-[var(--border-card)] hover:border-[var(--accent-primary)]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleTask(task.id, task.status)}
                            className="mt-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors shrink-0"
                            title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                          >
                            <CheckCircle2
                              className={`w-5 h-5 ${
                                isCompleted ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-400'
                              }`}
                            />
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm font-semibold text-[var(--text-primary)] truncate ${
                                  isCompleted ? 'line-through text-[var(--text-secondary)]' : ''
                                }`}
                              >
                                {task.title}
                              </p>
                              <Badge
                                variant={
                                  task.priority === 'high'
                                    ? 'danger'
                                    : task.priority === 'medium'
                                    ? 'warning'
                                    : 'neutral'
                                }
                                size="sm"
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">{task.suggested_activity}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-1.5">
                              <span>Topic: {task.topic}</span>
                              {task.due_date && (
                                <>
                                  <span>•</span>
                                  <span>Due: {task.due_date}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={
                            task.status === 'completed'
                              ? 'success'
                              : task.status === 'in_progress'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Knowledge Gaps & Activity Feed */}
        <div className="space-y-6">
          {/* Knowledge Gap Highlights */}
          <Card>
            <CardHeader
              title="Topic Mastery Map"
              subtitle="Real calibration from your submitted attempts"
              action={
                <Button
                  onClick={() => navigate('/knowledge')}
                  variant="ghost"
                  size="sm"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Details
                </Button>
              }
            />
            <CardContent>
              {knowledgeGaps.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp className="w-6 h-6" />}
                  title="No topic data yet"
                  description="Submit quizzes to map your strengths and gaps."
                  actionLabel="Start Quiz"
                  onAction={() => navigate('/quizzes')}
                />
              ) : (
                <div className="space-y-4">
                  {knowledgeGaps.slice(0, 5).map((gap) => (
                    <div key={gap.topic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--text-primary)]">{gap.topic}</span>
                        <Badge
                          variant={
                            gap.status === 'weak'
                              ? 'danger'
                              : gap.status === 'developing'
                              ? 'warning'
                              : gap.status === 'strong'
                              ? 'success'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {gap.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            gap.accuracy < 50
                              ? 'bg-rose-500'
                              : gap.accuracy < 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, gap.accuracy)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                        <span>{gap.attempts_count} attempts</span>
                        <span className="font-semibold">{gap.accuracy}% accuracy</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Timeline */}
          <Card>
            <CardHeader
              title="Recent Activity"
              subtitle="Real timestamped events"
            />
            <CardContent>
              {!progress?.recent_activity || progress.recent_activity.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                  No recorded activity yet. Upload materials or submit quizzes to build history.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {progress.recent_activity.slice(0, 5).map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-0.5">
                        {act.type === 'quiz_attempt' ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
