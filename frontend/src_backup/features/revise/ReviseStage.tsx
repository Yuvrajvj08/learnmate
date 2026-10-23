import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { revisionsApi } from '@/api/revisions';
import { diagnosticsApi } from '@/api/diagnostics';
import { useProfile } from '@/context/ProfileContext';
import type { TaskDetails, RevisionPlan, RevisionItem, DiagnosticAttempt } from '@/types';

interface ReviseStageProps {
  task: TaskDetails;
  onTaskUpdated?: () => void;
}

export const ReviseStage: React.FC<ReviseStageProps> = ({ task, onTaskUpdated }) => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const [plans, setPlans] = useState<RevisionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<RevisionPlan | null>(null);
  const [attempts, setAttempts] = useState<DiagnosticAttempt[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, attemptsData] = await Promise.all([
        revisionsApi.listPlans(task.id),
        diagnosticsApi.listAttempts(task.id),
      ]);

      setPlans(plansData);
      setAttempts(attemptsData);

      if (plansData.length > 0) {
        setActivePlan(plansData[0]);
      }
      if (attemptsData.length > 0) {
        setSelectedAttemptId(attemptsData[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load revision plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [task.id]);

  const handleGeneratePlan = async () => {
    if (!activeProfile) return;
    try {
      setIsGenerating(true);
      setError(null);
      const newPlan = await revisionsApi.generatePlan(task.id, {
        student_id: activeProfile.id,
        attempt_id: selectedAttemptId || undefined,
      });

      setPlans((prev) => [newPlan, ...prev]);
      setActivePlan(newPlan);
      onTaskUpdated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate revision plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleItem = async (item: RevisionItem) => {
    const updatedStatus = !item.is_completed;

    // Optimistic UI update
    if (activePlan) {
      const updatedItems = activePlan.items.map((it) =>
        it.id === item.id ? { ...it, is_completed: updatedStatus } : it
      );
      const completedCount = updatedItems.filter((it) => it.is_completed).length;
      setActivePlan({
        ...activePlan,
        items: updatedItems,
        completed_count: completedCount,
      });
    }

    try {
      await revisionsApi.toggleItem(item.id, updatedStatus);
      onTaskUpdated?.();
    } catch (err: any) {
      console.error('Failed to update revision status in SQLite:', err);
      // Revert on error
      fetchData();
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <Badge variant="rose" size="sm" icon={<AlertOctagon className="w-3 h-3" />}>Critical Priority</Badge>;
      case 'High':
        return <Badge variant="rose" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>High Priority</Badge>;
      case 'Medium':
        return <Badge variant="amber" size="sm">Medium Priority</Badge>;
      case 'Low':
        return <Badge variant="emerald" size="sm">Reinforcement</Badge>;
      default:
        return <Badge variant="slate" size="sm">{priority}</Badge>;
    }
  };

  const getHeatmapColor = (priority: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    switch (priority) {
      case 'Critical':
      case 'High':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Low':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[#151A33] to-[#12162E] border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="amber" size="sm">
              Stage 3 • Targeted Revision
            </Badge>
            <span className="text-xs text-slate-400">
              Personalised Actionable Remediation
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Targeted Adaptive Study Plan</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Prioritised strictly by diagnostic severity: misconceptions and gaps first, followed by fragile
            knowledge and maintenance practice. Never generic flashcards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {attempts.length > 0 && (
            <select
              value={selectedAttemptId}
              onChange={(e) => setSelectedAttemptId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white focus:outline-none"
            >
              {attempts.map((att) => (
                <option key={att.id} value={att.id}>
                  Attempt #{att.attempt_number} ({att.score_pct}%)
                </option>
              ))}
            </select>
          )}

          <Button
            variant="glow"
            isLoading={isGenerating}
            onClick={handleGeneratePlan}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {activePlan ? 'Regenerate Plan' : 'Generate Revision Plan'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading revision roadmap...</span>
        </div>
      ) : activePlan && activePlan.items.length > 0 ? (
        <div className="space-y-6">
          {/* Topic Heatmap & Progress Bar */}
          <Card className="p-6 bg-[#141836] border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  Topic Mastery Heatmap
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual priority calibration based on your real diagnostic results
                </p>
              </div>

              {/* Completion Counter */}
              <div className="flex items-center gap-3 bg-slate-900/60 px-4 py-2 rounded-xl border border-white/[0.06]">
                <span className="text-xs text-slate-300">
                  Completed: <strong className="text-emerald-400">{activePlan.completed_count}</strong> / {activePlan.total_count}
                </span>
                <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${activePlan.total_count > 0 ? (activePlan.completed_count / activePlan.total_count) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Accessible Heatmap Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-2">
              {activePlan.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${getHeatmapColor(
                    item.priority,
                    item.is_completed
                  )}`}
                >
                  <span className="text-xs font-bold truncate">{item.topic}</span>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-current/20 text-[10px]">
                    <span>{item.is_completed ? 'Completed' : item.priority}</span>
                    {item.is_completed && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-400 border-t border-white/[0.04]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Red: Misconception / Critical Gap
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Amber: Fragile Understanding
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Green: Mastered / Completed
              </span>
            </div>
          </Card>

          {/* Priority-Ordered Revision Task Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Actionable Remediation Modules ({activePlan.items.length})
              </h3>
              <span className="text-xs text-slate-400">Check boxes to persist completion status</span>
            </div>

            <div className="space-y-4">
              {activePlan.items.map((item, idx) => {
                return (
                  <Card
                    key={item.id}
                    className={`p-6 transition-all border ${
                      item.is_completed
                        ? 'bg-[#101429]/60 border-emerald-500/30 opacity-80'
                        : item.priority === 'Critical'
                        ? 'bg-[#18152e] border-rose-500/30 shadow-lg shadow-rose-950/20'
                        : 'bg-[#141836] border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          title="Click to toggle completed in SQLite"
                        >
                          {item.is_completed ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                            <h4
                              className={`text-lg font-bold transition-all ${
                                item.is_completed ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {item.topic}
                            </h4>
                          </div>

                          <p className="text-xs text-rose-300 font-medium">
                            Diagnostic Diagnosis: {item.why_you_struggled}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getPriorityBadge(item.priority)}
                        <Badge variant="cyan" size="sm">
                          p.{item.must_read_pages?.join(', ') || '1'}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {/* Left: Simplified Reteach & Memory Hook */}
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Targeted Conceptual Reteach
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed bg-[#0c1024] p-3.5 rounded-xl border border-white/[0.04]">
                            {item.simplified_reteach}
                          </p>
                        </div>

                        {item.quick_memory_hook && (
                          <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/25 flex items-start gap-2 text-xs text-violet-200">
                            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-white block text-[11px]">Memory Anchor:</strong>
                              {item.quick_memory_hook}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Recommended Action & Practice Activity */}
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Concrete Revision Action
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed bg-[#0c1024] p-3.5 rounded-xl border border-white/[0.04]">
                            {item.recommended_action}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Active Recall Challenge
                          </span>
                          <p className="text-xs text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                            {item.practice_activity}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Source Quote */}
                    {item.key_quote && (
                      <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-slate-400 italic">
                        Source Reference: “{item.key_quote}”
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Bottom Next Step Link */}
          <div className="p-5 rounded-2xl bg-[#12162E] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="text-xs text-slate-300">
              Completed your targeted study? Validate your growth on Stage 4.
            </div>
            <Button
              variant="glow"
              size="lg"
              onClick={() => navigate(`/tasks/${task.id}/master`)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Stage 4: Master Assessment
            </Button>
          </div>
        </div>
      ) : (
        /* Empty State: No plan generated yet */
        <EmptyState
          icon={<Repeat className="w-6 h-6" />}
          title="No revision plan generated yet"
          description={
            attempts.length > 0
              ? `You have completed ${attempts.length} diagnostic attempt(s). Generate a customised revision plan based on your latest results.`
              : 'Take a diagnostic quiz in Stage 2 first to generate a tailored revision plan, or generate a baseline plan directly from the study material.'
          }
          actionText={attempts.length > 0 ? 'Generate Revision Plan' : 'Take Diagnostic Quiz First'}
          onAction={attempts.length > 0 ? handleGeneratePlan : () => navigate(`/tasks/${task.id}/diagnose`)}
          secondaryActionText={attempts.length === 0 ? 'Generate Preliminary Plan Anyway' : undefined}
          onSecondaryAction={attempts.length === 0 ? handleGeneratePlan : undefined}
        />
      )}
    </div>
  );
};
