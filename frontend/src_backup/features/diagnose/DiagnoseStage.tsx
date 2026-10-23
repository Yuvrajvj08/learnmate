import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Clock,
  RotateCcw,
  BarChart2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { diagnosticsApi } from '@/api/diagnostics';
import { useProfile } from '@/context/ProfileContext';
import type {
  TaskDetails,
  QuizGeneration,
  QuizQuestion,
  ConfidenceLevel,
  DiagnosticAttempt,
} from '@/types';

interface DiagnoseStageProps {
  task: TaskDetails;
  onTaskUpdated?: () => void;
}

export const DiagnoseStage: React.FC<DiagnoseStageProps> = ({ task, onTaskUpdated }) => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const [attempts, setAttempts] = useState<DiagnosticAttempt[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<DiagnosticAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Quiz State
  const [quiz, setQuiz] = useState<QuizGeneration | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, ConfidenceLevel>>({});

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await diagnosticsApi.listAttempts(task.id);
      setAttempts(list);
      if (list.length > 0) {
        setActiveAttempt(list[0]); // latest
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load diagnostic attempts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [task.id]);

  const handleStartQuiz = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const generated = await diagnosticsApi.generateQuiz(task.id, 8);
      setQuiz(generated);
      setAnswers({});
      setConfidences({});
      setActiveAttempt(null); // Switch to active quiz mode
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate diagnostic quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    // Default confidence to Medium if not selected yet
    if (!confidences[questionId]) {
      setConfidences((prev) => ({ ...prev, [questionId]: 'Medium' }));
    }
  };

  const handleSelectConfidence = (questionId: string, level: ConfidenceLevel) => {
    setConfidences((prev) => ({ ...prev, [questionId]: level }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !activeProfile) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await diagnosticsApi.submitAttempt(task.id, {
        student_id: activeProfile.id,
        attempt_type: 'diagnostic',
        answers,
        confidences,
      });

      setAttempts((prev) => [result, ...prev]);
      setActiveAttempt(result);
      setQuiz(null); // Exit quiz taker mode
      onTaskUpdated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit quiz attempt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'Mastered':
        return <Badge variant="emerald" size="sm">Mastered</Badge>;
      case 'Reasonably understood':
        return <Badge variant="cyan" size="sm">Understood</Badge>;
      case 'Fragile knowledge':
        return <Badge variant="amber" size="sm">Fragile Knowledge</Badge>;
      case 'Possible misconception':
        return <Badge variant="rose" size="sm">Possible Misconception</Badge>;
      case 'Known knowledge gap':
        return <Badge variant="rose" size="sm">Knowledge Gap</Badge>;
      default:
        return <Badge variant="slate" size="sm">{classification}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/30 via-[#151A33] to-[#12162E] border border-rose-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="rose" size="sm">
              Stage 2 • Adaptive Diagnosis
            </Badge>
            <span className="text-xs text-slate-400">
              Confidence-Calibrated Deterministic Scoring
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Identify Strengths & Knowledge Gaps</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Test your understanding with source-grounded questions. Indicating your confidence allows
            LearnMate to separate confident misconceptions from accidental guesses.
          </p>
        </div>

        {!quiz && (
          <Button
            variant="glow"
            isLoading={isGenerating}
            onClick={handleStartQuiz}
            icon={<Brain className="w-4 h-4" />}
          >
            {attempts.length > 0 ? 'Start New Diagnostic Quiz' : 'Take Diagnostic Quiz'}
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Active Quiz Taking Mode */}
      {quiz ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Diagnostic Assessment</span>
              <span className="text-xs text-slate-400">
                ({Object.keys(answers).length} of {quiz.total_questions} answered)
              </span>
            </div>
            <button
              onClick={() => setQuiz(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel Quiz
            </button>
          </div>

          <div className="space-y-6">
            {quiz.questions.map((q, idx) => {
              const selectedOpt = answers[q.question_id];
              const selectedConf = confidences[q.question_id] || 'Medium';

              return (
                <Card key={q.question_id} className="p-5 space-y-4 bg-[#141836]/90 border border-white/[0.08]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{q.topic_title}</span>
                    </div>
                    <Badge variant="cyan" size="sm">
                      p.{q.source_page}
                    </Badge>
                  </div>

                  <p className="text-sm font-medium text-white leading-relaxed">{q.question_text}</p>

                  {/* Options */}
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
                              ? 'bg-violet-600/25 border-violet-500 text-white shadow-md'
                              : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isChosen ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.option_id}
                          </span>
                          <span className="mt-0.5 leading-snug">{opt.option_text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Confidence selector (appears once an option is selected) */}
                  {selectedOpt && (
                    <div className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        How confident are you in this answer?
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['Low', 'Medium', 'High'] as ConfidenceLevel[]).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleSelectConfidence(q.question_id, lvl)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              selectedConf === lvl
                                ? lvl === 'High'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : lvl === 'Medium'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800/60 text-slate-400 border border-transparent hover:text-slate-200'
                            }`}
                          >
                            {lvl === 'Low' && 'Low (Guess)'}
                            {lvl === 'Medium' && 'Medium (Fair)'}
                            {lvl === 'High' && 'High (Confident)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-[#12162E] border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-2xl backdrop-blur-xl">
            <div className="text-xs text-slate-300">
              Answered <strong className="text-white">{Object.keys(answers).length}</strong> of{' '}
              <strong className="text-white">{quiz.total_questions}</strong> questions.
            </div>
            <Button
              variant="glow"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleSubmitQuiz}
              disabled={Object.keys(answers).length === 0}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Submit Diagnostic Attempt
            </Button>
          </div>
        </div>
      ) : activeAttempt ? (
        /* Mode 2: Viewing Diagnostic Results */
        <div className="space-y-6">
          {/* Attempt Selector / Switcher */}
          {attempts.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 overflow-x-auto pb-1">
              <span>Past Attempts:</span>
              {attempts.map((att) => (
                <button
                  key={att.id}
                  onClick={() => setActiveAttempt(att)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    activeAttempt.id === att.id
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Attempt #{att.attempt_number} • {att.score_pct}% ({new Date(att.created_at).toLocaleDateString()})
                </button>
              ))}
            </div>
          )}

          {/* Results Summary Scorecard */}
          <Card className="p-6 bg-gradient-to-br from-[#161B3B] to-[#111429] border border-violet-500/20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Score Dial */}
              <div className="text-center md:border-r border-white/[0.08] pr-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Overall Accuracy
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {activeAttempt.score_pct}%
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {activeAttempt.correct_count} of {activeAttempt.total_questions} correct
                </div>
              </div>

              {/* Categorization Breakdown */}
              <div className="md:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Diagnostic Category Matrix
                  </h4>
                  <span className="text-[11px] text-slate-500">Pure Python Deterministic Scoring</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Mastered</span>
                    <span className="text-xl font-bold text-emerald-300">
                      {activeAttempt.diagnostic_counts?.['Mastered'] || 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Correct + High Conf</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] text-amber-400 block font-semibold">Fragile</span>
                    <span className="text-xl font-bold text-amber-300">
                      {activeAttempt.diagnostic_counts?.['Fragile knowledge'] || 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Correct + Low Conf</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] text-rose-400 block font-semibold">Misconceptions</span>
                    <span className="text-xl font-bold text-rose-300">
                      {activeAttempt.diagnostic_counts?.['Possible misconception'] || 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Incorrect + High Conf</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <span className="text-[10px] text-slate-400 block font-semibold">Knowledge Gaps</span>
                    <span className="text-xl font-bold text-slate-300">
                      {(activeAttempt.diagnostic_counts?.['Known knowledge gap'] || 0) +
                        (activeAttempt.diagnostic_counts?.['Uncertain understanding'] || 0)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Incorrect + Med/Low</span>
                  </div>
                </div>

                {/* Direct Action Link to Revise */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Weak topics detected:{' '}
                    <strong className="text-rose-300">
                      {activeAttempt.weak_topics?.join(', ') || 'None identified'}
                    </strong>
                  </div>

                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => navigate(`/tasks/${task.id}/revise`)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Generate Targeted Revision Plan
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-violet-400" />
              Itemized Response Review ({activeAttempt.answers.length} Questions)
            </h3>

            <div className="space-y-3">
              {activeAttempt.answers.map((ans, idx) => (
                <Card
                  key={ans.question_id || idx}
                  className={`p-4 space-y-3 bg-[#131731] border transition-all ${
                    ans.is_correct ? 'border-emerald-500/20' : 'border-rose-500/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {ans.is_correct ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-white">Q{idx + 1}. {ans.topic}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getClassificationBadge(ans.classification)}
                      <Badge variant="cyan" size="sm">
                        p.{ans.source_page}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{ans.question_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        ans.is_correct
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <span className="text-[10px] block opacity-75 font-semibold">Your Answer</span>
                      Option {ans.selected_option} (Confidence: {ans.confidence})
                    </div>

                    {!ans.is_correct && (
                      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200">
                        <span className="text-[10px] block text-emerald-400 font-semibold">Correct Answer</span>
                        Option {ans.correct_option}
                      </div>
                    )}
                  </div>

                  {ans.explanation && (
                    <p className="text-[11px] text-slate-400 leading-relaxed bg-[#0c1024] p-3 rounded-xl border border-white/[0.04]">
                      <strong>Explanation:</strong> {ans.explanation}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: No quiz attempts yet */
        <EmptyState
          icon={<Brain className="w-6 h-6" />}
          title="No diagnostic quiz taken yet"
          description="Take an adaptive 8-question quiz to test your understanding. LearnMate will calculate your accuracy and categorize misconceptions deterministically."
          actionText="Take Diagnostic Quiz"
          onAction={handleStartQuiz}
        />
      )}
    </div>
  );
};
