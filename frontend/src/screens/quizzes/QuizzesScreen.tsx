import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  Clock,
  Minus,
  Plus,
  History,
} from 'lucide-react';
import { materialsApi } from '@/api/materials';
import { quizzesApi } from '@/api/quizzes';
import type {
  MaterialData,
  QuizData,
  QuizResultData,
  QuizAttemptItem,
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

  // Recent Attempts State
  const [recentAttempts, setRecentAttempts] = useState<QuizAttemptItem[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Results State
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);

  // Loading & Error States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load materials & recent attempts on mount
  const loadInitialData = useCallback(async () => {
    try {
      const [matRes, attemptsRes] = await Promise.all([
        materialsApi.list(50, 0).catch(() => ({ materials: [], total: 0 })),
        quizzesApi.getRecentAttempts(5).catch(() => []),
      ]);

      setMaterials(matRes.materials || []);
      setRecentAttempts(attemptsRes || []);

      const passedId = location.state?.materialId;
      const passedTopic = location.state?.topic;

      if (passedId && matRes.materials.some((m) => m.id === passedId)) {
        setSelectedMaterialId(passedId);
      } else if (matRes.materials.length > 0) {
        setSelectedMaterialId(matRes.materials[0].id);
      }

      if (passedTopic) {
        setTopic(passedTopic);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz options.');
    }
  }, [location.state]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Quiz Creation
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      setError('Please choose a study material to generate questions from.');
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

      // Refresh recent attempts list in background
      quizzesApi.getRecentAttempts(5).then(setRecentAttempts).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate quiz submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------- Render View 1: Quiz Creator ----------------
  if (viewMode === 'create') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {error && <ErrorAlert message={error} />}

        <Card>
          <CardHeader
            title="Create practice or diagnostic quiz"
            subtitle="Generate questions strictly grounded in your course materials"
          />
          <CardContent>
            {isGenerating ? (
              <LoadingSpinner
                label="Analyzing material and formulating questions with Gemini..."
                size="lg"
                className="py-16"
              />
            ) : (
              <form onSubmit={handleCreateQuiz} className="space-y-5">
                {/* Material Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Study material *
                  </label>
                  <select
                    required
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--accent-primary)]"
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
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Quiz type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'practice', label: 'Practice quiz', desc: 'General self-testing' },
                      { id: 'diagnostic', label: 'Diagnostic quiz', desc: 'Identifies knowledge gaps' },
                      { id: 'follow_up', label: 'Follow-up quiz', desc: 'Measures score improvement' },
                    ].map((type) => {
                      const isSelected = quizType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setQuizType(type.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent-subtle)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20 shadow-2xs'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          <p className={`text-xs font-bold ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                            {type.label}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{type.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focus Topic & Question Count */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Focus topic (optional)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Glycolysis, Mitosis, Thermodynamics"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  {/* Bounded Stepper & Preset Choices for Question Count */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Question count
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-[var(--border-card)] rounded-xl bg-[var(--bg-secondary)] p-1">
                        <button
                          type="button"
                          onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                          disabled={questionCount <= 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-white disabled:opacity-30 cursor-pointer"
                          aria-label="Decrease question count"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-[var(--text-primary)]">
                          {questionCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuestionCount(Math.min(15, questionCount + 1))}
                          disabled={questionCount >= 15}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-white disabled:opacity-30 cursor-pointer"
                          aria-label="Increase question count"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {[3, 5, 10].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setQuestionCount(preset)}
                            className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                              questionCount === preset
                                ? 'bg-[var(--accent-primary)] text-white shadow-2xs font-semibold'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Difficulty level
                  </label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-colors cursor-pointer ${
                          difficulty === diff
                            ? 'bg-[var(--accent-primary)] text-white shadow-2xs'
                            : 'bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">
                    Answer keys are verified server-side.
                  </span>
                  <Button
                    type="submit"
                    disabled={!selectedMaterialId || isGenerating}
                    loading={isGenerating}
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    Generate quiz
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Compact Recent Quizzes / Attempts Section */}
        <Card>
          <CardHeader
            title="Recent quiz attempts"
            subtitle="Previous evaluations with objective scoring and feedback"
          />
          <CardContent>
            {recentAttempts.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                No past quiz attempts yet. Generate a quiz above to start testing your comprehension.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {recentAttempts.map((attempt) => {
                  const scorePct = Math.round(attempt.score_percentage);
                  return (
                    <div
                      key={attempt.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)] truncate">
                            {attempt.topic}
                          </span>
                          <Badge
                            variant={
                              attempt.quiz_type === 'diagnostic'
                                ? 'warning'
                                : attempt.quiz_type === 'follow_up'
                                ? 'accent'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {attempt.quiz_type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{attempt.correct_count}/{attempt.total_questions} correct</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            scorePct >= 70
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : scorePct >= 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {scorePct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            Exit quiz
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
          <CardContent className="space-y-5">
            {/* Question Prompt */}
            <div className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-relaxed">
              {currentQuestion.prompt}
            </div>

            {/* Answer Options */}
            <div className="space-y-2">
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
            <div className="pt-5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-[50%]">
                {activeQuiz.questions.map((q, idx) => {
                  const isAnswered = !!selectedAnswers[q.id];
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--accent-primary)] text-white'
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
                  Submit quiz
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
          className={`rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6 ${
            isPassing
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : 'bg-gradient-to-r from-amber-600 to-rose-700'
          }`}
        >
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Assessment completed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isPassing ? 'Great comprehension!' : 'Targeted revision recommended'}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 max-w-xl">
              {quizResult.recommended_next_action}
            </p>
          </div>

          <div className="text-center bg-white/15 backdrop-blur-md p-5 rounded-2xl border border-white/20 shrink-0 min-w-36">
            <p className="text-4xl sm:text-5xl font-black tracking-tight">
              {Math.round(quizResult.score_percentage)}%
            </p>
            <p className="text-xs font-medium text-white/80 mt-1">
              {quizResult.correct_count} of {quizResult.total_questions} correct
            </p>
          </div>
        </div>

        {/* Question-by-Question Breakdown */}
        <Card>
          <CardHeader
            title="Question breakdown & explanations"
            subtitle="Verified feedback evaluated objectively server-side"
          />
          <CardContent className="space-y-3.5">
            {quizResult.questions.map((q) => (
              <div
                key={q.question_id}
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  q.is_correct
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {q.is_correct ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Question {q.question_number} {q.topic && `• ${q.topic}`}
                      </p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                        {q.prompt}
                      </p>
                    </div>
                  </div>
                  <Badge variant={q.is_correct ? 'success' : 'danger'} size="sm">
                    {q.is_correct ? 'Correct' : 'Incorrect'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Your answer:</span>
                    <p className={`font-semibold mt-0.5 ${q.is_correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Option {q.selected_option}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Correct answer:</span>
                    <p className="font-semibold text-emerald-600 mt-0.5">
                      Option {q.correct_option}
                    </p>
                  </div>
                </div>

                {q.explanation && (
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Explanation:
                    </span>
                    <p className="leading-relaxed text-[var(--text-secondary)]">{q.explanation}</p>
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
            Create another quiz
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/knowledge')}
              variant="secondary"
              size="md"
            >
              Revision plan
            </Button>
            <Button
              onClick={() => navigate('/progress')}
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              View progress
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizzesScreen;
