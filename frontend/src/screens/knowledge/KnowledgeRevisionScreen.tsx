import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTodo,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCw,
  Search,
  Filter,
  CheckSquare,
  Bot,
} from 'lucide-react';
import { analyticsApi } from '@/api/analytics';
import { revisionApi } from '@/api/revision';
import type {
  KnowledgeGapItem,
  MisconceptionItem,
  RevisionTaskItem,
} from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';

export const KnowledgeRevisionScreen: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'revision' | 'gaps' | 'misconceptions'>('revision');
  const [loading, setLoading] = useState(true);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revisionTasks, setRevisionTasks] = useState<RevisionTaskItem[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGapItem[]>([]);
  const [misconceptions, setMisconceptions] = useState<MisconceptionItem[]>([]);

  // Task filter
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, gapsRes, miscRes] = await Promise.all([
        revisionApi.getPlan().catch(() => ({ tasks: [], total_tasks: 0, pending_tasks: 0, completed_tasks: 0 })),
        analyticsApi.getKnowledgeGaps().catch(() => ({ topics: [], total_topics: 0 })),
        analyticsApi.getMisconceptions().catch(() => ({ misconceptions: [], total_misconceptions: 0 })),
      ]);

      setRevisionTasks(revRes.tasks || []);
      setKnowledgeGaps(gapsRes.topics || []);
      setMisconceptions(miscRes.misconceptions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load revision and analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate / Refresh Plan with AI
  const handleGeneratePlan = async () => {
    setIsRefreshingPlan(true);
    setError(null);
    try {
      const updated = await revisionApi.generatePlan();
      setRevisionTasks(updated.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to update revision recommendations.');
    } finally {
      setIsRefreshingPlan(false);
    }
  };

  // Toggle task status
  const handleUpdateTaskStatus = async (
    taskId: string,
    currentStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await revisionApi.updateTaskStatus(taskId, nextStatus);
      const updated = await revisionApi.getPlan();
      setRevisionTasks(updated.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  const filteredTasks = revisionTasks.filter((t) => {
    if (taskFilter === 'pending') return t.status !== 'completed';
    if (taskFilter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* Header & Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shrink-0 shadow-2xs">
          <button
            onClick={() => setActiveTab('revision')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'revision'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Revision Plan</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {revisionTasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'gaps'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Knowledge Gap Map</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {knowledgeGaps.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('misconceptions')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'misconceptions'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Diagnosed Misconceptions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {misconceptions.length}
            </span>
          </button>
        </div>

        {activeTab === 'revision' && (
          <Button
            onClick={handleGeneratePlan}
            loading={isRefreshingPlan}
            variant="outline"
            size="sm"
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Regenerate Plan from Quiz History
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Calibrating knowledge gaps and recommendations..." size="lg" className="py-20" />
      ) : activeTab === 'revision' ? (
        /* Tab 1: Revision Plan */
        <Card>
          <CardHeader
            title="Adaptive Revision Plan"
            subtitle="Prioritized actions based on recent performance and diagnosed weakness"
            action={
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                {(['all', 'pending', 'completed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      taskFilter === filter
                        ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            }
          />
          <CardContent>
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="w-6 h-6" />}
                title={taskFilter === 'completed' ? 'No completed tasks' : 'No revision tasks found'}
                description={
                  taskFilter === 'completed'
                    ? 'Complete pending tasks above to see them in this view.'
                    : 'Take a practice quiz to generate personalized recommendations.'
                }
                actionLabel="Practice Quiz"
                onAction={() => navigate('/quizzes')}
              />
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start justify-between gap-4 ${
                        isCompleted
                          ? 'bg-[var(--bg-secondary)]/40 border-[var(--border-card)] opacity-65'
                          : 'bg-[var(--bg-card)] border-[var(--border-card)] hover:border-[var(--accent-primary)]'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, task.status as any)}
                          className="mt-0.5 text-slate-400 hover:text-[var(--accent-primary)] transition-colors shrink-0 cursor-pointer"
                          title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                        >
                          <CheckCircle2
                            className={`w-5 h-5 ${
                              isCompleted
                                ? 'text-emerald-500 fill-emerald-500/20'
                                : 'text-slate-400'
                            }`}
                          />
                        </button>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-semibold text-[var(--text-primary)] ${
                                isCompleted ? 'line-through text-[var(--text-secondary)]' : ''
                              }`}
                            >
                              {task.title}
                            </span>
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
                              {task.priority.toUpperCase()} PRIORITY
                            </Badge>
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] font-medium">
                            {task.suggested_activity}
                          </p>

                          <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                            <span className="font-semibold text-[var(--text-primary)]">Why this was assigned: </span>
                            {task.reason}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1">
                            <span>Topic: {task.topic}</span>
                            {task.due_date && <span>• Due: {task.due_date}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          onClick={() => navigate('/quizzes', { state: { topic: task.topic } })}
                          variant="ghost"
                          size="sm"
                          icon={<CheckSquare className="w-3.5 h-3.5" />}
                        >
                          Practice
                        </Button>
                        <Button
                          onClick={() => navigate('/tutor')}
                          variant="outline"
                          size="sm"
                          icon={<Bot className="w-3.5 h-3.5" />}
                        >
                          Ask Tutor
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'gaps' ? (
        /* Tab 2: Knowledge Gap Map */
        <Card>
          <CardHeader
            title="Topic Mastery & Knowledge Gap Map"
            subtitle="Real calculations derived from student attempt history"
          />
          <CardContent>
            {knowledgeGaps.length === 0 ? (
              <EmptyState
                icon={<TrendingDown className="w-6 h-6" />}
                title="No topic gaps mapped yet"
                description="Complete quizzes to let LearnMate identify your strengths and blind spots."
                actionLabel="Take a Quiz"
                onAction={() => navigate('/quizzes')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knowledgeGaps.map((gap) => (
                  <div
                    key={gap.topic}
                    className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-[var(--text-primary)]">
                          {gap.topic}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {gap.attempts_count} practice attempt(s) recorded
                        </p>
                      </div>
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

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Accuracy:</span>
                        <span className="font-bold text-[var(--text-primary)]">{gap.accuracy}%</span>
                      </div>
                      <div className="w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            gap.accuracy < 50
                              ? 'bg-rose-500'
                              : gap.accuracy < 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, gap.accuracy)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] space-y-1">
                      <span className="font-semibold text-[var(--text-primary)] text-[11px] uppercase tracking-wider block">
                        Actionable Recommendation:
                      </span>
                      <p>{gap.recommended_action}</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        onClick={() => navigate('/quizzes', { state: { topic: gap.topic } })}
                        variant="outline"
                        size="sm"
                        icon={<CheckSquare className="w-3.5 h-3.5" />}
                      >
                        Targeted Quiz
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Tab 3: Diagnosed Misconceptions */
        <Card>
          <CardHeader
            title="Diagnosed Student Misconceptions"
            subtitle="Grounded strictly in incorrect answers from quiz attempts"
          />
          <CardContent>
            {misconceptions.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-6 h-6" />}
                title="No diagnosed misconceptions"
                description="When you select plausible distractors in diagnostic quizzes, LearnMate pinpoints the underlying conceptual confusion here."
                actionLabel="Take Diagnostic Quiz"
                onAction={() => navigate('/quizzes')}
              />
            ) : (
              <div className="space-y-4">
                {misconceptions.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Topic: {m.topic}
                          </span>
                          <Badge variant="warning" size="sm">
                            Confidence: {m.confidence}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mt-1">
                          {m.misconception_text}
                        </h4>
                      </div>
                    </div>

                    {/* Evidence Quote */}
                    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--text-muted)] text-[11px] uppercase">
                          Evidence Question:
                        </span>
                        <p className="font-medium text-[var(--text-primary)] mt-0.5">{m.evidence_question}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--text-muted)] text-[11px] uppercase">
                          Observed Answer:
                        </span>
                        <p className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5">{m.evidence_answer}</p>
                      </div>
                    </div>

                    {/* Remediation Practice */}
                    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-xs space-y-1">
                      <span className="font-bold text-[var(--accent-primary)] text-[11px] uppercase tracking-wider block">
                        Suggested Remediation:
                      </span>
                      <p className="text-[var(--text-secondary)]">{m.suggested_practice}</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        onClick={() => navigate('/tutor')}
                        variant="outline"
                        size="sm"
                        icon={<Bot className="w-3.5 h-3.5" />}
                      >
                        Ask Tutor About This
                      </Button>
                      <Button
                        onClick={() => navigate('/quizzes', { state: { topic: m.topic } })}
                        variant="primary"
                        size="sm"
                        icon={<CheckSquare className="w-3.5 h-3.5" />}
                      >
                        Retest Concept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
