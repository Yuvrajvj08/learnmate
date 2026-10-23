import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Brain,
  HelpCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Send,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { masteryApi } from '@/api/mastery';
import { diagnosticsApi } from '@/api/diagnostics';
import { useProfile } from '@/context/ProfileContext';
import type {
  TaskDetails,
  QuizGeneration,
  ConfidenceLevel,
  MasteryComparison,
  DiagnosticAttempt,
  TeachBackResult,
} from '@/types';

interface MasterStageProps {
  task: TaskDetails;
  onTaskUpdated?: () => void;
}

export const MasterStage: React.FC<MasterStageProps> = ({ task, onTaskUpdated }) => {
  const { activeProfile } = useProfile();

  const [attempts, setAttempts] = useState<DiagnosticAttempt[]>([]);
  const [latestComparison, setLatestComparison] = useState<MasteryComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active follow-up quiz state
  const [quiz, setQuiz] = useState<QuizGeneration | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, ConfidenceLevel>>({});

  // Teach-back state
  const [teachTopic, setTeachTopic] = useState('');
  const [teachExplanation, setTeachExplanation] = useState('');
  const [isSubmittingTeach, setIsSubmittingTeach] = useState(false);
  const [teachResult, setTeachResult] = useState<TeachBackResult | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const history = await masteryApi.getHistory(task.id);
      setAttempts(history);

      const allDiag = await diagnosticsApi.listAttempts(task.id);
      const baseline = allDiag.find((a) => a.attempt_type === 'diagnostic');

      if (history.length > 0 && baseline) {
        const latestFollowup = history[0];
        const delta = Math.round((latestFollowup.score_pct - baseline.score_pct) * 10) / 10;
        setLatestComparison({
          baseline_attempt: baseline,
          followup_attempt: latestFollowup,
          score_delta_pct: delta,
          accuracy_diff_percentage_points: delta,
          summary_message:
            delta >= 0
              ? `You improved by +${delta}% percentage points compared to your baseline assessment!`
              : `Accuracy difference of ${delta}% percentage points from baseline.`,
          topic_comparisons: [],
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load mastery data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [task.id]);

  const handleStartFollowupQuiz = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const generated = await masteryApi.generateQuiz(task.id, 6);
      setQuiz(generated);
      setAnswers({});
      setConfidences({});
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate targeted follow-up quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (!confidences[questionId]) {
      setConfidences((prev) => ({ ...prev, [questionId]: 'High' }));
    }
  };

  const handleSubmitFollowup = async () => {
    if (!quiz || !activeProfile) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const comparison = await masteryApi.submitAttempt(task.id, {
        student_id: activeProfile.id,
        attempt_type: 'followup',
        answers,
        confidences,
      });

      setLatestComparison(comparison);
      setQuiz(null);
      fetchData();
      onTaskUpdated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit follow-up assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeachBack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachTopic.trim() || !teachExplanation.trim() || !activeProfile) return;

    setIsSubmittingTeach(true);
    try {
      const res = await masteryApi.teachBack(task.id, {
        student_id: activeProfile.id,
        topic: teachTopic.trim(),
        explanation_text: teachExplanation.trim(),
        language: activeProfile.preferred_language || 'English',
      });
      setTeachResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate teach-back explanation');
    } finally {
      setIsSubmittingTeach(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#151A33] to-[#12162E] border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">
              Stage 4 • Proven Mastery
            </Badge>
            <span className="text-xs text-slate-400">
              Evidence-Based Comparison & Retesting
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Measure Real Improvement</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Evaluate your knowledge gains after revision. Compare follow-up accuracy against your
            original diagnostic baseline in real percentage points.
          </p>
        </div>

        {!quiz && (
          <Button
            variant="glow"
            isLoading={isGenerating}
            onClick={handleStartFollowupQuiz}
            icon={<Trophy className="w-4 h-4 text-emerald-300" />}
          >
            {attempts.length > 0 ? 'Retake Follow-up Quiz' : 'Start Mastery Follow-up Quiz'}
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Active Follow-up Quiz Taking */}
      {quiz ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Targeted Mastery Assessment</span>
              <span className="text-xs text-emerald-400 font-medium">
                (Focused on fragile & previously missed concepts)
              </span>
            </div>
            <button
              onClick={() => setQuiz(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-5">
            {quiz.questions.map((q, idx) => {
              const selectedOpt = answers[q.question_id];
              return (
                <Card key={q.question_id} className="p-5 space-y-4 bg-[#141836] border border-white/[0.08]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{q.topic_title}</span>
                    </div>
                    <Badge variant="cyan" size="sm">
                      p.{q.source_page}
                    </Badge>
                  </div>

                  <p className="text-sm font-medium text-white leading-relaxed">{q.question_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt) => {
                      const isChosen = selectedOpt === opt.option_id;
                      return (
                        <button
                          key={opt.option_id}
                          type="button"
                          onClick={() => handleSelectOption(q.question_id, opt.option_id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-emerald-600/25 border-emerald-500 text-white shadow-md'
                              : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isChosen ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.option_id}
                          </span>
                          <span className="mt-0.5 leading-snug">{opt.option_text}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-[#12162E] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-2xl backdrop-blur-xl">
            <div className="text-xs text-slate-300">
              Answered <strong className="text-white">{Object.keys(answers).length}</strong> of{' '}
              <strong className="text-white">{quiz.total_questions}</strong> follow-up questions.
            </div>
            <Button
              variant="glow"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleSubmitFollowup}
              disabled={Object.keys(answers).length === 0}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Submit & Compare With Baseline
            </Button>
          </div>
        </div>
      ) : latestComparison ? (
        /* Mode 2: Evidence-Based Comparison Dashboard */
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-[#121935] via-[#141A38] to-[#10132B] border border-emerald-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                  Measured Learning Growth
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Baseline vs. Post-Revision Comparison
                </h3>
              </div>
              <Badge variant="emerald" size="md" icon={<TrendingUp className="w-3.5 h-3.5" />}>
                Delta Calculated
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {/* Baseline */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold block mb-1">
                  Baseline Diagnostic
                </span>
                <div className="text-3xl font-extrabold text-slate-300">
                  {latestComparison.baseline_attempt
                    ? `${latestComparison.baseline_attempt.score_pct}%`
                    : 'N/A'}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {latestComparison.baseline_attempt
                    ? `Attempt #1 (${latestComparison.baseline_attempt.correct_count}/${latestComparison.baseline_attempt.total_questions} correct)`
                    : 'No prior baseline attempt'}
                </span>
              </div>

              {/* Follow-up */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40">
                <span className="text-xs text-emerald-400 font-semibold block mb-1">
                  Master Follow-up Score
                </span>
                <div className="text-3xl font-extrabold text-emerald-300">
                  {latestComparison.followup_attempt.score_pct}%
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {latestComparison.followup_attempt.correct_count} of{' '}
                  {latestComparison.followup_attempt.total_questions} questions correct
                </span>
              </div>

              {/* Delta in percentage points */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-violet-900/30 to-indigo-900/20 border border-violet-500/30 flex flex-col items-center justify-center">
                <span className="text-xs text-violet-300 font-semibold block mb-1">
                  Accuracy Difference (Percentage Points)
                </span>
                <div className="text-4xl font-extrabold text-white flex items-center gap-1">
                  <ArrowUpRight className="w-7 h-7 text-emerald-400" />
                  {latestComparison.accuracy_diff_percentage_points !== null &&
                  latestComparison.accuracy_diff_percentage_points !== undefined
                    ? `${latestComparison.accuracy_diff_percentage_points > 0 ? '+' : ''}${latestComparison.accuracy_diff_percentage_points}%`
                    : '—'}
                </div>
                <span className="text-[11px] text-slate-400 mt-1">
                  followup accuracy − baseline accuracy
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#0c1024] border border-white/[0.05] text-xs text-slate-300 leading-relaxed">
              💡 <strong>Summary:</strong> {latestComparison.summary_message}
            </div>
          </Card>

          {/* Formative Teach-Back Section */}
          <Card className="p-6 bg-[#131733] border border-violet-500/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Teach-Back Mastery Challenge</h4>
                  <p className="text-[11px] text-slate-400">
                    Explain a concept in your own words. AI evaluates conceptual understanding without altering quiz scores.
                  </p>
                </div>
              </div>
              <Badge variant="cyan" size="sm">
                Formative Feedback
              </Badge>
            </div>

            <form onSubmit={handleTeachBack} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs text-slate-400 block mb-1">Concept to Explain</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coulomb's Law"
                    value={teachTopic}
                    onChange={(e) => setTeachTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Your Explanation</label>
                  <input
                    type="text"
                    required
                    placeholder="Explain how it works, what depends on what, and key limitations..."
                    value={teachExplanation}
                    onChange={(e) => setTeachExplanation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={isSubmittingTeach}
                  disabled={!teachTopic.trim() || teachExplanation.trim().length < 15}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Evaluate Explanation
                </Button>
              </div>
            </form>

            {/* Teach Back Results */}
            {teachResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-violet-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Evaluation: {teachResult.topic}</span>
                  <Badge variant={teachResult.passed ? 'emerald' : 'amber'} size="sm">
                    {teachResult.passed ? 'Demonstrated Mastery' : 'Developing Understanding'} ({teachResult.accuracy_score}/100)
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <strong className="text-emerald-400 block mb-1">What You Nailed:</strong>
                    <p className="text-slate-300">{teachResult.what_you_nailed}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <strong className="text-rose-400 block mb-1">Conceptual Gaps:</strong>
                    <p className="text-slate-300">{teachResult.conceptual_gaps}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <strong className="text-violet-400 block mb-1">Actionable Feedback:</strong>
                    <p className="text-slate-300">{teachResult.actionable_feedback}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Empty State: No follow-up attempts yet */
        <EmptyState
          icon={<Trophy className="w-6 h-6 text-emerald-400" />}
          title="No follow-up assessment taken yet"
          description="Ready to verify your improvement after reviewing your Stage 3 revision cards? Take a targeted follow-up quiz to measure your accuracy delta in percentage points."
          actionText="Take Follow-up Quiz"
          onAction={handleStartFollowupQuiz}
        />
      )}
    </div>
  );
};
