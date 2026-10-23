import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  BookOpen,
  FileText,
  Upload,
  Brain,
  Repeat,
  Trophy,
  ArrowRight,
  Clock,
  Trash2,
  AlertCircle,
  FileUp,
  Sparkles,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProfile } from '@/context/ProfileContext';
import { tasksApi } from '@/api/tasks';
import { sourcesApi } from '@/api/sources';
import type { TaskSummary } from '@/types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Task creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'pasted' | 'pdf'>('pasted');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.list(activeProfile.id);
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load learning tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeProfile?.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    if (!title.trim()) {
      setFormError('Please enter a task title');
      return;
    }

    if (creationMode === 'pasted' && pastedText.trim().length < 20) {
      setFormError('Please provide at least a couple of sentences of study text (min 20 characters)');
      return;
    }

    if (creationMode === 'pdf' && !selectedFile) {
      setFormError('Please select a PDF file to upload');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // 1. Create task container
      const task = await tasksApi.create({
        student_id: activeProfile.id,
        title: title.trim(),
        subject: subject.trim() || 'General Study',
        source_type: creationMode === 'pdf' ? 'pdf' : 'pasted_text',
      });

      // 2. Ingest document
      if (creationMode === 'pdf' && selectedFile) {
        await sourcesApi.uploadPdf(task.id, selectedFile);
      } else {
        await sourcesApi.pasteText(task.id, {
          raw_text: pastedText.trim(),
          title: title.trim(),
          subject: subject.trim(),
        });
      }

      // 3. Reset and navigate to Stage 1 Learn
      setIsModalOpen(false);
      setTitle('');
      setPastedText('');
      setSelectedFile(null);
      navigate(`/tasks/${task.id}/learn`);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to create task and process material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this study task?')) return;
    try {
      await tasksApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.message || 'Could not delete task');
    }
  };

  // Metrics calculation
  const totalTasks = tasks.length;
  const attemptsWithScores = tasks.filter((t) => t.latest_score_pct !== null && t.latest_score_pct !== undefined);
  const avgScore =
    attemptsWithScores.length > 0
      ? (attemptsWithScores.reduce((acc, t) => acc + (t.latest_score_pct || 0), 0) / attemptsWithScores.length).toFixed(1)
      : null;
  const totalAttempts = tasks.reduce((acc, t) => acc + (t.attempts_count || 0), 0);

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Top Header / Greeting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {activeProfile?.display_name || 'Student'}
              </h1>
              <Badge variant="cyan" size="sm">
                Active Workspace
              </Badge>
            </div>
            <p className="text-sm text-slate-400">
              Transform study materials into targeted diagnoses, personalised revision, and proven mastery.
            </p>
          </div>

          <Button
            variant="glow"
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Learning Task
          </Button>
        </div>

        {/* Real Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Saved Tasks</span>
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-bold text-white">{totalTasks}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ingested study materials</div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Diagnostic Attempts</span>
              <Brain className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white">{totalAttempts}</div>
            <div className="text-[11px] text-slate-500 mt-1">Stage 2 quizzes completed</div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Average Score</span>
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {avgScore !== null ? `${avgScore}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {avgScore !== null ? 'Deterministic accuracy' : 'No quiz attempts yet'}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Language</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {activeProfile?.preferred_language || 'English'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Preferred explanation mode</div>
          </Card>
        </div>

        {/* Task List / Workspace Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" />
              Your Study Tasks
            </h2>
            <span className="text-xs text-slate-400">{tasks.length} active tasks</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading your learning tasks...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No study tasks yet"
              description="Upload a PDF chapter or paste study notes to start your personalised learning journey."
              actionText="Create First Task"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  variant="interactive"
                  onClick={() => navigate(`/tasks/${task.id}/learn`)}
                  className="p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={task.source_type === 'pdf' ? 'violet' : 'cyan'}
                        size="sm"
                        icon={task.source_type === 'pdf' ? <Upload className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      >
                        {task.source_type === 'pdf' ? 'PDF Source' : 'Pasted Text'}
                      </Badge>

                      <button
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{task.subject || 'General Study'}</p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Pages/Chunks</span>
                        <span className="font-semibold">{task.total_pages} {task.source_type === 'pdf' ? 'pages' : 'passages'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Latest Score</span>
                        <span className="font-semibold text-emerald-400">
                          {task.latest_score_pct !== null && task.latest_score_pct !== undefined
                            ? `${task.latest_score_pct}%`
                            : 'Not tested'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-violet-400 group-hover:text-violet-300 font-medium inline-flex items-center gap-1 text-xs">
                      Enter Workspace <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Learning Task"
        subtitle="Ingest study material to generate concepts, quizzes, and adaptive revision"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateTask} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Source Material Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreationMode('pasted')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  creationMode === 'pasted'
                    ? 'bg-violet-600/20 border-violet-500 text-white shadow-md'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Pasted Study Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('pdf')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  creationMode === 'pdf'
                    ? 'bg-violet-600/20 border-violet-500 text-white shadow-md'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileUp className="w-4 h-4 text-violet-400" />
                <span>Upload PDF Document</span>
              </button>
            </div>
          </div>

          {/* Title & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Task Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Thermodynamics Chapter 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Subject / Topic</label>
              <input
                type="text"
                placeholder="e.g. Physics, Biology, History"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Conditional Input based on mode */}
          {creationMode === 'pasted' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Pasted Study Content *</label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {pastedText.length} characters
                </span>
              </div>
              <textarea
                rows={6}
                required
                placeholder="Paste your textbook excerpt, lecture notes, or syllabus content here. LearnMate will preserve passage boundaries and generate structured concepts..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-violet-500 font-sans leading-relaxed"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Upload PDF File (Max 20 pages) *</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-900/30">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      if (!title) {
                        setTitle(e.target.files[0].name.replace(/\.pdf$/i, ''));
                      }
                    }
                  }}
                  className="hidden"
                  id="pdf-upload-input"
                />
                <label htmlFor="pdf-upload-input" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">
                    {selectedFile ? selectedFile.name : 'Click to browse or drop PDF here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    PyMuPDF extracts text preserving exact physical page numbers
                  </p>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="glow"
              isLoading={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Process & Begin Learning
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
