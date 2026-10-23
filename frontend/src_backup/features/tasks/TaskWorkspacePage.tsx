import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  Repeat,
  Trophy,
  ArrowLeft,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { tasksApi } from '@/api/tasks';
import type { TaskDetails } from '@/types';
import { LearnStage } from '@/features/learn/LearnStage';
import { DiagnoseStage } from '@/features/diagnose/DiagnoseStage';
import { ReviseStage } from '@/features/revise/ReviseStage';
import { MasterStage } from '@/features/master/MasterStage';

type ActiveStage = 'learn' | 'diagnose' | 'revise' | 'master';

export const TaskWorkspacePage: React.FC = () => {
  const { taskId, stage } = useParams<{ taskId: string; stage?: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeStage: ActiveStage =
    stage === 'diagnose' || stage === 'revise' || stage === 'master'
      ? stage
      : 'learn';

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.get(taskId);
      setTask(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const stages = [
    {
      id: 'learn' as ActiveStage,
      stageNum: '1',
      label: 'Learn',
      sublabel: 'Grounded Concepts & Q&A',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'diagnose' as ActiveStage,
      stageNum: '2',
      label: 'Diagnose',
      sublabel: 'Adaptive Quiz & Gaps',
      icon: <Brain className="w-4 h-4" />,
    },
    {
      id: 'revise' as ActiveStage,
      stageNum: '3',
      label: 'Revise',
      sublabel: 'Actionable Priority Plan',
      icon: <Repeat className="w-4 h-4" />,
    },
    {
      id: 'master' as ActiveStage,
      stageNum: '4',
      label: 'Master',
      sublabel: 'Targeted Retest & Progress',
      icon: <Trophy className="w-4 h-4" />,
    },
  ];

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workspace Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to Dashboard
              </Link>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-violet-400 font-mono">{task?.subject || 'Study Task'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {task?.title || 'Loading task...'}
              </h1>
              {task && (
                <Badge variant={task.source_type === 'pdf' ? 'violet' : 'cyan'} size="sm">
                  {task.total_pages} {task.source_type === 'pdf' ? 'PDF Pages' : 'Passages'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Non-linear Adaptive Navigation Active</span>
          </div>
        </div>

        {/* 4-Stage Navigation Bar (NO ARTIFICIAL LOCKS) */}
        <div className="bg-[#12162E]/90 border border-white/[0.08] p-1.5 rounded-2xl backdrop-blur-xl shadow-lg shadow-black/20">
          <nav className="grid grid-cols-2 md:grid-cols-4 gap-1.5" aria-label="Learning Stages">
            {stages.map((st) => {
              const isActive = activeStage === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => navigate(`/tasks/${taskId}/${st.id}`)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 border border-violet-400/30'
                      : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white shadow-inner'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    {st.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-violet-200' : 'text-slate-500'}`}>
                        Stage {st.stageNum}
                      </span>
                    </div>
                    <div className="text-sm font-semibold truncate leading-tight">
                      {st.label}
                    </div>
                    <div className={`text-[11px] truncate hidden sm:block ${isActive ? 'text-violet-100/80' : 'text-slate-500'}`}>
                      {st.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Workspace Body / Stage Rendering */}
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Preparing study environment...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : task ? (
          <div className="pt-2">
            {activeStage === 'learn' && <LearnStage task={task} onTaskUpdated={fetchTaskDetails} />}
            {activeStage === 'diagnose' && <DiagnoseStage task={task} onTaskUpdated={fetchTaskDetails} />}
            {activeStage === 'revise' && <ReviseStage task={task} onTaskUpdated={fetchTaskDetails} />}
            {activeStage === 'master' && <MasterStage task={task} onTaskUpdated={fetchTaskDetails} />}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
};
