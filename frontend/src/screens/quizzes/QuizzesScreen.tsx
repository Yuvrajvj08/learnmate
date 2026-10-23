import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Award,
} from 'lucide-react';
import { materialsApi } from '@/api/materials';
import { quizzesApi } from '@/api/quizzes';
import type {
  MaterialData,
  QuizData,
  QuizResultData,
} from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type QuizViewMode = 'create' | 'active' | 'results';

export const QuizzesScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Mode: 'create' | 'active' | 'results'
  const [viewMode, setViewMode] = useState<QuizViewMode>('create');

  // Materials & Form State
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quizType, setQuizType] = useState<'practice' | 'diagnostic' | 'follow_up'>('practice');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // question_id -> selected_option

  // Results State
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);

  // Loading & Error States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load materials on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMaterials = async () => {
      try {
        const res = await materialsApi.list(50, 0);
        if (isMounted) {
          setMaterials(res.materials || []);
          const passedId = location.state?.materialId;
          const passedTopic = location.state?.topic;

          if (passedId && res.materials.some((m) => m.id === passedId)) {
            setSelectedMaterialId(passedId);
          } else if (res.materials.length > 0) {
            setSelectedMaterialId(res.materials[0].id);
          }

          if (passedTopic) {
            setTopic(passedTopic);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load materials.');
      }
    };

    fetchMaterials();
    return () => {
      isMounted = false;
    };
  }, [location.state]);

  // Handle Quiz Creation
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      setError('Please select a study material to generate questions from.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const quiz = await quizzesApi.create({
        material_id: selectedMaterialId,
        quiz_type: quizType,
        topic: topic.trim() || undefined,
        question_count: questionCount,
        difficulty,
      });

      setActiveQuiz(quiz);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setViewMode('active');
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz with AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select Option for Active Question
  const handleSelectOption = (questionId: string, optionString: string) => {
    // Extract letter prefix if present (e.g., "A. Cytosol" -> "A")
    const match = optionString.match(/^([A-D])\./i);
    const optionKey = match ? match[1].toUpperCase() : optionString;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // Submit Quiz for Grading
  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    // Verify all answered
    const unansweredCount = activeQuiz.questions.filter((q) => !selectedAnswers[q.id]).length;
    if (unansweredCount > 0) {
      const proceed = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Submit anyway?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formattedAnswers = Object.entries(selectedAnswers).map(([qId, opt]) => ({
        question_id: qId,
        selected_option: opt,
      }));

      const result = await quizzesApi.submit(activeQuiz.id, formattedAnswers);
      setQuizResult(result);
      setViewMode('results');
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate quiz submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------- Render View 1: Quiz Creator ----------------
  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <Card>
          <CardHeader
            title="Create Practice or Diagnostic Quiz"
            subtitle="Generate questions strictly grounded in your course materials"
          />
          <CardContent>
            {isGenerating ? (
              <LoadingSpinner
                label="Analyzing material and formulating multiple-choice questions with Gemini..."
                size="lg"
                className="py-16"
              />
            ) : (
              <form onSubmit={handleCreateQuiz} className="space-y-5 max-w-2xl">
                {/* Material Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                    Study Material Source *
                  </label>
                  <select
                    required
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--accent-primary)]"
                  >
                    {materials.length === 0 ? (
                      <option value="">No materials available — upload one first</option>
                    ) : (
                      materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} ({m.material_type.toUpperCase()} • {m.page_count} pages)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Quiz Type */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                    Quiz Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'practice', label: 'Practice Quiz', desc: 'Standard comprehension' },
                      { id: 'diagnostic', label: 'Diagnostic Quiz', desc: 'Maps misconceptions' },
                      { id: 'follow_up', label: 'Follow-up Quiz', desc: 'Verifies score delta' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setQuizType(type.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          quizType === type.id
                            ? 'bg-[var(--accent-subtle)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-2xs'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <p className="text-xs font-bold">{type.label}</p>
                        <p className="text-[11px] opacity-80 mt-0.5">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Topic & Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                      Focus Topic (Optional)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Glycolysis, Mitosis, Thermodynamics"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                      Question Count (1-15)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                    Difficulty Level
                  </label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl capitalize transition-colors ${
                          difficulty === diff
                            ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                            : 'bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Answer keys are strictly concealed until submission.
                  </span>
                  <Button
                    type="submit"
                    disabled={!selectedMaterialId || isGenerating}
                    loading={isGenerating}
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    Generate Quiz
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------- Render View 2: Active Quiz Practice ----------------
  if (viewMode === 'active' && activeQuiz) {
    const currentQuestion = activeQuiz.questions[currentQuestionIndex];
    const totalQuestions = activeQuiz.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {error && <ErrorAlert message={error} />}

        {/* Progress & Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('create')}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Exit Quiz
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">
              {activeQuiz.quiz_type.toUpperCase()}
            </Badge>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Difficulty: <span className="capitalize">{activeQuiz.difficulty}</span>
            </span>
          </div>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center justify-between w-full">
                <span>
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">
                  {answeredCount}/{totalQuestions} answered
                </span>
              </div>
            }
            subtitle={currentQuestion.topic ? `Topic: ${currentQuestion.topic}` : undefined}
          />
          <CardContent className="space-y-6">
            {/* Question Prompt */}
            <div className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-relaxed">
              {currentQuestion.prompt}
            </div>

            {/* Answer Options */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const match = option.match(/^([A-D])\./i);
                const optKey = match ? match[1].toUpperCase() : option;
                const isSelected = selectedAnswers[currentQuestion.id] === optKey;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, option)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-subtle)] border-[var(--accent-primary)] text-[var(--text-primary)] font-semibold shadow-2xs'
                        : 'bg-[var(--bg-secondary)]/50 border-[var(--border-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'bg-[var(--border-card)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-xs sm:text-sm">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Pagination & Submit Bar */}
            <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%]">
                {activeQuiz.questions.map((q, idx) => {
                  const isAnswered = !!selectedAnswers[q.id];
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        isCurrent
                          ? 'bg-[var(--accent-primary)] text-white ring-2 ring-[var(--accent-glow)]'
                          : isAnswered
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-card)]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmitQuiz}
                  loading={isSubmitting}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------- Render View 3: Quiz Results Review ----------------
  if (viewMode === 'results' && quizResult) {
    const isPassing = quizResult.score_percentage >= 70;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {error && <ErrorAlert message={error} />}

        {/* Score Hero Banner */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 ${
            isPassing
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : 'bg-gradient-to-r from-amber-600 to-rose-700'
          }`}
        >
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Assessment Completed & Evaluated</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isPassing ? 'Excellent Mastery Demonstrated!' : 'Targeted Revision Recommended'}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 max-w-xl">
              {quizResult.recommended_next_action}
            </p>
          </div>

          <div className="text-center bg-white/15 backdrop-blur-md p-5 rounded-2xl border border-white/20 shrink-0 min-w-40">
            <p className="text-4xl sm:text-5xl font-black tracking-tight">
              {Math.round(quizResult.score_percentage)}%
            </p>
            <p className="text-xs font-medium text-white/80 mt-1">
              {quizResult.correct_count} of {quizResult.total_questions} correct
            </p>
          </div>
        </div>

        {/* Updated Topic Mastery Cards */}
        {quizResult.updated_mastery && quizResult.updated_mastery.length > 0 && (
          <Card>
            <CardHeader
              title="Calibrated Topic Mastery"
              subtitle="Real-time calibration based on this submission"
            />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {quizResult.updated_mastery.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)] truncate">{m.topic}</span>
                      <Badge
                        variant={
                          m.status === 'weak'
                            ? 'danger'
                            : m.status === 'developing'
                            ? 'warning'
                            : m.status === 'strong'
                            ? 'success'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {m.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      Accuracy: {m.accuracy}%
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                      {m.recommended_action}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question-by-Question Breakdown */}
        <Card>
          <CardHeader
            title="Question-by-Question Evaluation & Explanations"
            subtitle="Verified feedback returned directly from the server"
          />
          <CardContent className="space-y-4">
            {quizResult.questions.map((q) => (
              <div
                key={q.question_id}
                className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  q.is_correct
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {q.is_correct ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Question {q.question_number} {q.topic && `• ${q.topic}`}
                      </p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                        {q.prompt}
                      </p>
                    </div>
                  </div>
                  <Badge variant={q.is_correct ? 'success' : 'danger'} size="sm">
                    {q.is_correct ? 'Correct' : 'Incorrect'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Your Answer:</span>
                    <p className={`font-semibold mt-0.5 ${q.is_correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Option {q.selected_option}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Correct Answer:</span>
                    <p className="font-semibold text-emerald-600 mt-0.5">
                      Option {q.correct_option}
                    </p>
                  </div>
                </div>

                {q.explanation && (
                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Explanation:
                    </span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            onClick={() => setViewMode('create')}
            variant="outline"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Create Another Quiz
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/knowledge')}
              variant="secondary"
              size="md"
              icon={<TrendingUp className="w-4 h-4" />}
            >
              View Revision Plan
            </Button>
            <Button
              onClick={() => navigate('/progress')}
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Learning Progress
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
