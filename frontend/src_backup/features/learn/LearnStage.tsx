import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  MessageSquare,
  Send,
  ShieldCheck,
  AlertTriangle,
  Quote,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { learningApi } from '@/api/learning';
import { useProfile } from '@/context/ProfileContext';
import type { TaskDetails, ChapterBreakdown, TopicItem, GroundedAnswer } from '@/types';

interface LearnStageProps {
  task: TaskDetails;
  onTaskUpdated?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'learnmate';
  text: string;
  isAvailable?: boolean;
  citedPages?: number[];
  quote?: string | null;
  time: string;
}

export const LearnStage: React.FC<LearnStageProps> = ({ task, onTaskUpdated }) => {
  const { activeProfile } = useProfile();
  const [breakdown, setBreakdown] = useState<ChapterBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Q&A State
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learningApi.getBreakdown(task.id);
      setBreakdown(data);
      if (data.detected_topics.length > 0) {
        setSelectedTopic(data.detected_topics[0]);
      }
    } catch (err: any) {
      console.log('No breakdown yet or error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdown();
  }, [task.id]);

  const handleGenerateBreakdown = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await learningApi.generateBreakdown(task.id);
      const data = await learningApi.getBreakdown(task.id);
      setBreakdown(data);
      if (data && data.detected_topics && data.detected_topics.length > 0) {
        setSelectedTopic(data.detected_topics[0]);
      }
      onTaskUpdated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate chapter breakdown');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !activeProfile) return;

    const currentQ = question.trim();
    setQuestion('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'student',
      text: currentQ,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAsking(true);

    try {
      const resp = await learningApi.askQuestion(task.id, {
        student_id: activeProfile.id,
        question: currentQ,
        language: activeProfile.preferred_language || 'English',
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'learnmate',
        text: resp.answer_text,
        isAvailable: resp.is_available_in_material,
        citedPages: resp.cited_pages,
        quote: resp.supporting_quote,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'learnmate',
        text: `Error retrieving grounded answer: ${err.message || 'Could not connect to AI service'}`,
        isAvailable: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-900/30 via-[#151A33] to-[#12162E] border border-violet-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="violet" size="sm">
              Stage 1 • Concept Foundations
            </Badge>
            <span className="text-xs text-slate-400">
              Source: {task.source_type === 'pdf' ? 'Extracted PDF Pages' : 'Pasted Study Passages'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Understand Core Principles</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Explore AI-structured micro-lessons grounded directly in your uploaded material. Every concept
            traces to verifiable citations. Ask any question to verify your understanding.
          </p>
        </div>

        {(!breakdown || breakdown.detected_topics.length === 0) && (
          <Button
            variant="glow"
            isLoading={isGenerating}
            onClick={handleGenerateBreakdown}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Generate Concepts Breakdown
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Inspecting study material chunks...</span>
        </div>
      ) : !breakdown || breakdown.detected_topics.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="No concept breakdown yet"
          description="Let LearnMate extract and explain the key topics, definitions, formulas, and verified source citations from your study material."
          actionText="Generate Learning Breakdown"
          onAction={handleGenerateBreakdown}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Topics Breakdown List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Detected Topics ({breakdown.detected_topics.length})
              </span>
              <button
                onClick={handleGenerateBreakdown}
                disabled={isGenerating}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>

            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {breakdown.detected_topics.map((t) => {
                const isSelected = selectedTopic?.id === t.id;
                return (
                  <Card
                    key={t.id}
                    variant={isSelected ? 'glow' : 'interactive'}
                    onClick={() => setSelectedTopic(t)}
                    className={`p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500/60 bg-[#191E42]'
                        : 'border-white/[0.06] bg-[#131731]/80 hover:bg-[#161B3B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {t.topic_title}
                      </h4>
                      <Badge variant="cyan" size="sm">
                        p.{t.page_references?.join(', ') || '1'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {t.simple_explanation}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate italic max-w-[200px]">
                        "{t.key_takeaway}"
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Topic Deep Dive & Grounded Q&A */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Topic Card */}
            {selectedTopic && (
              <Card className="p-6 space-y-5 bg-[#141836]/90 border border-violet-500/20 shadow-xl">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
                  <div>
                    <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider block mb-1">
                      Concept Deep Dive
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {selectedTopic.topic_title}
                    </h3>
                  </div>

                  <Badge variant="cyan" size="md" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                    Source Page {selectedTopic.page_references?.join(', ') || '1'}
                  </Badge>
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Core Concept Explanation
                  </h5>
                  <p className="text-sm text-slate-200 leading-relaxed bg-[#0c1024]/60 p-4 rounded-xl border border-white/[0.05]">
                    {selectedTopic.simple_explanation}
                  </p>
                </div>

                {/* Key Takeaway */}
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Key Principle & Takeaway
                  </h5>
                  <div className="p-3.5 rounded-xl bg-violet-600/10 border border-violet-500/30 text-xs text-violet-200 font-medium leading-relaxed">
                    💡 {selectedTopic.key_takeaway}
                  </div>
                </div>

                {/* Exact Verified Source Quote */}
                {selectedTopic.exact_quote_snippet && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-cyan-400" />
                      Grounded Source Quote (Verified Passage)
                    </h5>
                    <blockquote className="text-xs text-slate-300 italic bg-[#0d1127] p-3.5 rounded-xl border-l-2 border-cyan-400 pl-4 leading-relaxed font-sans">
                      “{selectedTopic.exact_quote_snippet}”
                    </blockquote>
                  </div>
                )}
              </Card>
            )}

            {/* Grounded Q&A Assistant */}
            <Card className="p-5 space-y-4 bg-[#121630]/90 border border-white/[0.08]">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Grounded Study Assistant</h4>
                    <p className="text-[11px] text-slate-400">
                      Answers strictly grounded in your uploaded text with citations
                    </p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                  No Hallucinations
                </Badge>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Ask any question about this study material (e.g. "What is Coulomb's constant?",
                    "How does additivity of charge work?").
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'student' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          msg.sender === 'student'
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        <p>{msg.text}</p>
                        {msg.sender === 'learnmate' && msg.isAvailable && msg.citedPages && (
                          <div className="mt-2 pt-2 border-t border-white/[0.1] flex items-center gap-2 text-[10px] text-cyan-300">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            <span>Evidence found on page {msg.citedPages.join(', ')}</span>
                          </div>
                        )}
                        {msg.sender === 'learnmate' && !msg.isAvailable && (
                          <div className="mt-2 pt-2 border-t border-rose-500/20 flex items-center gap-1.5 text-[10px] text-rose-300">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Not present in uploaded material</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))
                )}
                {isAsking && (
                  <div className="flex items-center gap-2 text-xs text-violet-400 py-1">
                    <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    <span>Cross-referencing source passages...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleAskQuestion} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Ask a question about this material..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-violet-500 placeholder:text-slate-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={!question.trim() || isAsking}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Ask
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
