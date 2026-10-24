import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTodo,
  TrendingDown,
  AlertTriangle,
  RotateCw,
  Check,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Bot,
  CheckSquare,
  Clock,
  Sparkles,
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

  // Filtering & Sorting
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'topic' | 'newest'>('priority');
  const [groupBy, setGroupBy] = useState<'none' | 'priority' | 'topic'>('none');

  // Expanded "Why?" cards state (set of task IDs)
  const [expandedWhy, setExpandedWhy] = useState<Set<string>>(new Set());

  // Active secondary menu task ID
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

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

  // Close open dropdown menu on click outside
  useEffect(() => {
    const handleDocumentClick = () => setOpenMenuTaskId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

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

  // Toggle task completion
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

  const toggleWhy = (taskId: string) => {
    setExpandedWhy((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleStartRevision = (task: RevisionTaskItem) => {
    const activity = (task.suggested_activity || '').toLowerCase();
    if (activity.includes('tutor') || activity.includes('ask') || activity.includes('consult')) {
      navigate('/tutor', {
        state: {
          initialPrompt: `I'm working on my revision task for "${task.topic}": ${task.title}. ${task.suggested_activity}`,
        },
      });
    } else {
      navigate('/quizzes', { state: { topic: task.topic } });
    }
  };

  // Filtered and sorted tasks
  const processedTasks = useMemo(() => {
    const filtered = revisionTasks.filter((t) => {
      if (taskFilter === 'pending') return t.status !== 'completed';
      if (taskFilter === 'completed') return t.status === 'completed';
      return true;
    });

    const priorityWeight: Record<string, number> = { high: 1, medium: 2, low: 3 };

    return [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const pA = priorityWeight[a.priority] || 4;
        const pB = priorityWeight[b.priority] || 4;
        if (pA !== pB) return pA - pB;
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'topic') {
        return (a.topic || '').localeCompare(b.topic || '');
      }
      // Newest
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
  }, [revisionTasks, taskFilter, sortBy]);

  // Grouped tasks map
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All tasks': processedTasks };
    }
    if (groupBy === 'priority') {
      const groups: Record<string, RevisionTaskItem[]> = {
        'High priority': [],
        'Medium priority': [],
        'Low priority': [],
      };
      processedTasks.forEach((t) => {
        const key =
          t.priority === 'high'
            ? 'High priority'
            : t.priority === 'medium'
            ? 'Medium priority'
            : 'Low priority';
        groups[key].push(t);
      });
      return groups;
    }
    // Group by topic
    const groups: Record<string, RevisionTaskItem[]> = {};
    processedTasks.forEach((t) => {
      const key = t.topic || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [processedTasks, groupBy]);

  const renderTaskCard = (task: RevisionTaskItem) => {
    const isCompleted = task.status === 'completed';
    const isWhyExpanded = expandedWhy.has(task.id);
    const isMenuOpen = openMenuTaskId === task.id;

    // Short reason preview (first sentence or truncated at 90 chars)
    const shortReason =
      task.reason.length > 90
        ? `${task.reason.slice(0, 90).trim()}...`
        : task.reason;

    return (
      <div
        key={task.id}
        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start justify-between gap-4 ${
          isCompleted
            ? 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] opacity-70'
            : 'bg-[var(--bg-card)] border-[var(--border-card)] hover:border-[var(--accent-primary)]/40 shadow-2xs'
        }`}
      >
        {/* Left: Checkbox & Content */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={isCompleted}
            aria-label={isCompleted ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as completed`}
            onClick={() => handleUpdateTaskStatus(task.id, task.status as any)}
            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isCompleted
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-300 hover:border-[var(--accent-primary)] bg-white'
            }`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="min-w-0 space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-sm font-semibold text-[var(--text-primary)] ${
                  isCompleted ? 'line-through text-[var(--text-muted)]' : ''
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
                {task.priority === 'high'
                  ? 'High priority'
                  : task.priority === 'medium'
                  ? 'Medium priority'
                  : 'Low priority'}
              </Badge>
              {task.topic && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium border border-[var(--border-subtle)]">
                  {task.topic}
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {task.suggested_activity}
            </p>

            {/* Expandable Why section */}
            <div className="pt-0.5">
              {!isWhyExpanded ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="truncate max-w-md">{shortReason}</span>
                  <button
                    type="button"
                    onClick={() => toggleWhy(task.id)}
                    className="text-[var(--accent-primary)] hover:underline font-medium inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                  >
                    <span>Why?</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">Why this was assigned</span>
                    <button
                      type="button"
                      onClick={() => toggleWhy(task.id)}
                      className="text-[var(--accent-primary)] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Collapse</span>
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="leading-relaxed">{task.reason}</p>
                </div>
              )}
            </div>

            {task.due_date && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-0.5">
                <Clock className="w-3 h-3" />
                <span>Due: {task.due_date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Single Primary Action + Small Overflow Menu */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            onClick={() => handleStartRevision(task)}
            variant="primary"
            size="sm"
          >
            Start revision
          </Button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuTaskId(isMenuOpen ? null : task.id);
              }}
              className="p-1.5 rounded-lg border border-[var(--border-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors cursor-pointer"
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md py-1 z-20"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuTaskId(null);
                    navigate('/quizzes', { state: { topic: task.topic } });
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Practice quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuTaskId(null);
                    navigate('/tutor', {
                      state: {
                        initialPrompt: `Help me understand "${task.topic}": ${task.title}.`,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Ask tutor</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* Header & Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shrink-0 shadow-2xs">
          <button
            onClick={() => setActiveTab('revision')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'revision'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Revision plan</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold">
              {revisionTasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'gaps'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Knowledge gap map</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold">
              {knowledgeGaps.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('misconceptions')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'misconceptions'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Diagnosed misconceptions</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold">
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
            Regenerate plan
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Calibrating knowledge gaps and recommendations..." size="lg" className="py-20" />
      ) : activeTab === 'revision' ? (
        /* Tab 1: Revision Plan */
        <Card>
          <CardHeader
            title="Adaptive revision plan"
            subtitle="Prioritized actions based on recent performance and diagnosed weakness"
            action={
              <div className="flex flex-wrap items-center gap-3">
                {/* Status filter */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                  {(['all', 'pending', 'completed'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTaskFilter(filter)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer ${
                        taskFilter === filter
                          ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden"
                  >
                    <option value="priority">Priority</option>
                    <option value="topic">Topic (A–Z)</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>

                {/* Group selector */}
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">Group:</span>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden"
                  >
                    <option value="none">None</option>
                    <option value="priority">By priority</option>
                    <option value="topic">By topic</option>
                  </select>
                </div>
              </div>
            }
          />
          <CardContent>
            {processedTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="w-6 h-6" />}
                title={taskFilter === 'completed' ? 'No completed tasks' : 'No revision tasks found'}
                description={
                  taskFilter === 'completed'
                    ? 'Complete pending tasks above to see them in this view.'
                    : 'Take a practice quiz to generate personalized recommendations.'
                }
                actionLabel="Practice quiz"
                onAction={() => navigate('/quizzes')}
              />
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTasks).map(([groupTitle, tasks]) => {
                  if (tasks.length === 0) return null;
                  return (
                    <div key={groupTitle} className="space-y-3">
                      {groupBy !== 'none' && (
                        <div className="flex items-center gap-2 pb-1 border-b border-[var(--border-subtle)]">
                          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            {groupTitle}
                          </h4>
                          <span className="text-[11px] text-[var(--text-muted)] font-medium">
                            ({tasks.length})
                          </span>
                        </div>
                      )}
                      <div className="space-y-3">
                        {tasks.map(renderTaskCard)}
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
            title="Topic mastery & knowledge gap map"
            subtitle="Real calculations derived from student attempt history"
          />
          <CardContent>
            {knowledgeGaps.length === 0 ? (
              <EmptyState
                icon={<TrendingDown className="w-6 h-6" />}
                title="No topic gaps mapped yet"
                description="Complete quizzes to let LearnMate identify your strengths and blind spots."
                actionLabel="Take a quiz"
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
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
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
                        {gap.status === 'weak'
                          ? 'Weak'
                          : gap.status === 'developing'
                          ? 'Developing'
                          : gap.status === 'strong'
                          ? 'Strong'
                          : gap.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Accuracy</span>
                        <span className="font-semibold text-[var(--text-primary)]">{gap.accuracy}%</span>
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
                        Actionable recommendation
                      </span>
                      <p className="leading-relaxed">{gap.recommended_action}</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        onClick={() => navigate('/quizzes', { state: { topic: gap.topic } })}
                        variant="primary"
                        size="sm"
                        icon={<CheckSquare className="w-3.5 h-3.5" />}
                      >
                        Targeted quiz
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
            title="Diagnosed student misconceptions"
            subtitle="Grounded strictly in incorrect answers from quiz attempts"
          />
          <CardContent>
            {misconceptions.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-6 h-6" />}
                title="No diagnosed misconceptions"
                description="When you select plausible distractors in diagnostic quizzes, LearnMate pinpoints the underlying conceptual confusion here."
                actionLabel="Take diagnostic quiz"
                onAction={() => navigate('/quizzes')}
              />
            ) : (
              <div className="space-y-4">
                {misconceptions.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                            Topic: {m.topic}
                          </span>
                          <Badge variant="warning" size="sm">
                            Confidence: {m.confidence}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                          {m.misconception_text}
                        </h4>
                      </div>
                    </div>

                    {/* Evidence Quote */}
                    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--text-muted)] text-[11px] uppercase">
                          Evidence question:
                        </span>
                        <p className="font-medium text-[var(--text-primary)] mt-0.5">{m.evidence_question}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--text-muted)] text-[11px] uppercase">
                          Observed answer:
                        </span>
                        <p className="font-semibold text-rose-600 mt-0.5">{m.evidence_answer}</p>
                      </div>
                    </div>

                    {/* Remediation Practice */}
                    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] text-xs space-y-1">
                      <span className="font-semibold text-[var(--accent-primary)] text-[11px] uppercase tracking-wider block">
                        Suggested remediation
                      </span>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{m.suggested_practice}</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        onClick={() =>
                          navigate('/tutor', {
                            state: {
                              initialPrompt: `Help me understand why this is a misconception in ${m.topic}: "${m.misconception_text}"`,
                            },
                          })
                        }
                        variant="outline"
                        size="sm"
                        icon={<Bot className="w-3.5 h-3.5" />}
                      >
                        Ask tutor
                      </Button>
                      <Button
                        onClick={() => navigate('/quizzes', { state: { topic: m.topic } })}
                        variant="primary"
                        size="sm"
                        icon={<CheckSquare className="w-3.5 h-3.5" />}
                      >
                        Retest concept
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
