import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot,
  Send,
  FileText,
  BookmarkCheck,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { materialsApi } from '@/api/materials';
import { tutorApi } from '@/api/tutor';
import type { MaterialData, TutorData } from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';

interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  tutorData?: TutorData;
  timestamp: string;
}

export const AiTutorScreen: React.FC = () => {
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [learningLevel, setLearningLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load materials on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMaterials = async () => {
      try {
        const res = await materialsApi.list(50, 0);
        if (isMounted) {
          setMaterials(res.materials || []);
          // Check if materialId passed via navigation state
          const passedId = location.state?.materialId;
          if (passedId && res.materials.some((m) => m.id === passedId)) {
            setSelectedMaterialId(passedId);
          } else if (res.materials.length > 0) {
            setSelectedMaterialId(res.materials[0].id);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch materials.');
      }
    };

    fetchMaterials();
    return () => {
      isMounted = false;
    };
  }, [location.state]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingAnswer]);

  const handleAskQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || !selectedMaterialId) return;

    setError(null);
    setInputQuestion('');

    const studentMsg: ChatMessage = {
      id: `msg-${Date.now()}-student`,
      sender: 'student',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, studentMsg]);
    setIsLoadingAnswer(true);

    try {
      const tutorResponse = await tutorApi.ask(selectedMaterialId, q, learningLevel);
      const tutorMsg: ChatMessage = {
        id: `msg-${Date.now()}-tutor`,
        sender: 'tutor',
        text: tutorResponse.answer,
        tutorData: tutorResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } catch (err: any) {
      setError(err.message || 'Failed to receive tutor response.');
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAskQuestion(inputQuestion);
  };

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} />}

      {/* Top Controls Card: Material & Level Selectors */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Material Selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Target Study Material (Required Grounding Source)
              </label>
              <div className="relative">
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--accent-primary)] truncate"
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
            </div>

            {/* Learning Level Selector */}
            <div className="shrink-0">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Explanation Depth
              </label>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLearningLevel(lvl)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      learningLevel === lvl
                        ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Workspace */}
      <Card className="flex flex-col h-[650px] overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[var(--accent-primary)]" />
              <span>AI Personal Tutor</span>
            </div>
          }
          subtitle={
            selectedMaterial
              ? `Grounded strictly in: "${selectedMaterial.title}"`
              : 'Select a study material to activate grounded learning'
          }
          action={
            <div className="flex items-center gap-1.5">
              <Badge variant="success" size="sm" dot>
                Hallucination Guard Active
              </Badge>
            </div>
          }
        />

        {/* Message History */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] mb-4">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Ask anything about your notes
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                LearnMate explains concepts, answers questions, and provides page-level citations based exclusively on your uploaded material.
              </p>

              {/* Starter questions */}
              <div className="w-full mt-6 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Suggested Prompts
                </p>
                {[
                  'What are the core concepts covered in this material?',
                  'Can you summarize the introduction in simple terms?',
                  'Explain the key mechanism described in these notes with an analogy.',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(sample)}
                    className="w-full text-left p-2.5 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--border-card)] text-[var(--text-primary)] border border-[var(--border-card)] transition-colors flex items-center justify-between group"
                  >
                    <span>{sample}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--accent-primary)] transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'tutor' && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'student'
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Tutor Extra Grounding & Source Citations */}
                  {msg.tutorData && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-card)]/50 space-y-3">
                      {/* Grounding & Evidence Badge */}
                      <div className="flex items-center gap-2">
                        {msg.tutorData.insufficient_evidence ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Insufficient Evidence in Material (Abstained from Guessing)
                          </span>
                        ) : msg.tutorData.grounded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Grounded in Verified Material
                          </span>
                        ) : null}
                      </div>

                      {/* Source Citations */}
                      {msg.tutorData.sources && msg.tutorData.sources.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Source Citations:
                          </p>
                          <div className="space-y-1.5">
                            {msg.tutorData.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-xs text-[var(--text-primary)]"
                              >
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-primary)] mb-1">
                                  <BookmarkCheck className="w-3 h-3" />
                                  <span>
                                    {src.page_number
                                      ? `Page ${src.page_number}`
                                      : src.section_reference || 'Document Excerpt'}
                                  </span>
                                </div>
                                <p className="italic text-[11px] text-[var(--text-secondary)] font-serif leading-relaxed">
                                  "{src.excerpt}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up question chips */}
                      {msg.tutorData.follow_up_questions && msg.tutorData.follow_up_questions.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> Deepen Your Understanding:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.tutorData.follow_up_questions.map((fq, fqIdx) => (
                              <button
                                key={fqIdx}
                                onClick={() => handleAskQuestion(fq)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--bg-card)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] hover:text-[var(--accent-primary)] border border-[var(--border-card)] hover:border-[var(--accent-border)] transition-colors text-left"
                              >
                                {fq}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-2 text-right ${
                      msg.sender === 'student' ? 'text-white/70' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoadingAnswer && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                <LoadingSpinner label="Analyzing document excerpts with Gemini..." size="sm" className="p-0" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[var(--border-card)] bg-[var(--bg-card)]">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isLoadingAnswer || !selectedMaterialId}
              placeholder={
                !selectedMaterialId
                  ? 'Please select or upload a study material first...'
                  : 'Ask a question grounded in this material...'
              }
              className="flex-1 px-4 py-3 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!inputQuestion.trim() || isLoadingAnswer || !selectedMaterialId}
              loading={isLoadingAnswer}
              icon={<Send className="w-4 h-4" />}
            >
              Ask
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
