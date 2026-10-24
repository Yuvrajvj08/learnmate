import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  FileText,
  BookmarkCheck,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { materialsApi } from '@/api/materials';
import { tutorApi } from '@/api/tutor';
import type { MaterialData, TutorData } from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MaterialDetailModal } from '@/screens/materials/MaterialDetailModal';

interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  tutorData?: TutorData;
  timestamp: string;
}

export const AiTutorScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [learningLevel, setLearningLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const [isChangingMaterial, setIsChangingMaterial] = useState(false);
  const [citationModalMaterialId, setCitationModalMaterialId] = useState<string | null>(null);

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
    <div className="space-y-4 max-w-5xl mx-auto">
      {error && <ErrorAlert message={error} />}

      {/* Main Chat Card */}
      <Card className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[500px]">
        {/* Tutor Header with Active Material & Secondary Level Control */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5 leading-none">
                <span>AI study tutor</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              </h2>
              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1 truncate">
                <FileText className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs">
                  {selectedMaterial ? selectedMaterial.title : 'No material chosen'}
                </span>
                {selectedMaterial && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    ({selectedMaterial.material_type.toUpperCase()})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Secondary Learning Level Selector */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[11px]">
              {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLearningLevel(lvl)}
                  className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                    learningLevel === lvl
                      ? 'bg-white text-[var(--accent-primary)] shadow-2xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Change Material Action */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsChangingMaterial(!isChangingMaterial)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border-card)] text-[var(--text-primary)] border border-[var(--border-card)] transition-colors"
              >
                <span>Change material</span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              {isChangingMaterial && (
                <div
                  className="absolute right-0 mt-1 w-64 p-2 rounded-xl bg-white border border-[var(--border-card)] shadow-xl z-40 space-y-1 text-left"
                  onMouseLeave={() => setIsChangingMaterial(false)}
                >
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Select study material
                  </p>
                  {materials.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                      <p>No materials available.</p>
                      <button
                        onClick={() => navigate('/materials')}
                        className="text-[var(--accent-primary)] font-semibold mt-1 inline-block"
                      >
                        Upload a document
                      </button>
                    </div>
                  ) : (
                    materials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMaterialId(m.id);
                          setIsChangingMaterial(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                          selectedMaterialId === m.id
                            ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <span className="truncate">{m.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase shrink-0 ml-1">
                          {m.material_type}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-sm mx-auto">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Ask anything about your notes
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                LearnMate answers questions and cites page sources strictly from your study materials.
              </p>

              {/* Starter questions */}
              <div className="w-full mt-4 space-y-1.5">
                {[
                  'What are the core concepts covered in this material?',
                  'Can you summarize the introduction in simple terms?',
                  'Explain the key mechanism described in these notes.',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(sample)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--border-card)] text-[var(--text-primary)] border border-[var(--border-card)] transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{sample}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--accent-primary)] transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'tutor' && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'student'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Tutor Extra Grounding & Actionable Source Citations */}
                  {msg.tutorData && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--border-card)]/50 space-y-2">
                      {/* Evidence Badge */}
                      <div className="flex items-center gap-2">
                        {msg.tutorData.insufficient_evidence ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            Insufficient evidence in material (abstained from guessing)
                          </span>
                        ) : msg.tutorData.grounded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <ShieldCheck className="w-3 h-3" />
                            Grounded in verified material
                          </span>
                        ) : null}
                      </div>

                      {/* Clickable Source Citations */}
                      {msg.tutorData.sources && msg.tutorData.sources.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Source citations (click to view chunk in library):
                          </p>
                          <div className="space-y-1">
                            {msg.tutorData.sources.map((src, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setCitationModalMaterialId(selectedMaterialId)}
                                className="w-full text-left p-2 rounded-lg bg-white border border-[var(--border-card)] hover:border-[var(--accent-primary)] transition-all cursor-pointer group"
                                title="Click to view material chunks in library"
                              >
                                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--accent-primary)] mb-0.5">
                                  <div className="flex items-center gap-1">
                                    <BookmarkCheck className="w-3 h-3" />
                                    <span>
                                      {src.page_number
                                        ? `Page ${src.page_number}`
                                        : src.section_reference || 'Document excerpt'}
                                    </span>
                                  </div>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-primary)]" />
                                </div>
                                <p className="italic text-[11px] text-[var(--text-secondary)] font-serif leading-relaxed line-clamp-2">
                                  "{src.excerpt}"
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up question chips */}
                      {msg.tutorData.follow_up_questions && msg.tutorData.follow_up_questions.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> Follow-up questions:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {msg.tutorData.follow_up_questions.map((fq, fqIdx) => (
                              <button
                                key={fqIdx}
                                onClick={() => handleAskQuestion(fq)}
                                className="px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] hover:text-[var(--accent-primary)] border border-[var(--border-card)] transition-colors text-left"
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
                    className={`text-[10px] mt-1.5 text-right ${
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
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
                <LoadingSpinner label="Consulting notes..." size="sm" className="p-0" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Composer */}
        <div className="p-3 sm:p-3.5 border-t border-[var(--border-card)] bg-[var(--bg-card)]">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isLoadingAnswer || !selectedMaterialId}
              placeholder={
                !selectedMaterialId
                  ? 'Please choose a study material first...'
                  : `Ask a question about ${selectedMaterial?.title || 'your notes'}...`
              }
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)] disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!inputQuestion.trim() || isLoadingAnswer || !selectedMaterialId}
              loading={isLoadingAnswer}
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Ask
            </Button>
          </form>
        </div>
      </Card>

      {/* Actionable Citation / Chunk Viewer Modal */}
      <MaterialDetailModal
        materialId={citationModalMaterialId}
        isOpen={!!citationModalMaterialId}
        onClose={() => setCitationModalMaterialId(null)}
      />
    </div>
  );
};

export default AiTutorScreen;
