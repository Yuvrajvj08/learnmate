export type SourceType = 'pdf' | 'pasted_text' | 'sample';
export type ConfidenceLevel = 'Low' | 'Medium' | 'High';
export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type DiagnosticCategory =
  | 'Mastered'
  | 'Reasonably understood'
  | 'Fragile knowledge'
  | 'Known knowledge gap'
  | 'Uncertain understanding'
  | 'Possible misconception'
  | 'Not assessed';

export interface StudentProfile {
  id: string;
  display_name: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface TaskSummary {
  id: string;
  student_id: string;
  title: string;
  subject: string;
  source_type: SourceType;
  total_pages: number;
  current_stage: number;
  progress_pct: number;
  latest_score_pct?: number | null;
  topics_count: number;
  attempts_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDetails {
  id: string;
  student_id: string;
  title: string;
  subject: string;
  source_type: SourceType;
  total_pages: number;
  current_stage: number;
  progress_pct: number;
  source_metadata: Record<string, any>;
  source_fingerprint?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceChunk {
  id: string;
  task_id: string;
  page_number: number;
  content: string;
  word_count: number;
  is_virtual: boolean;
  chunk_order: number;
}

export interface TopicItem {
  id: string;
  task_id: string;
  topic_title: string;
  simple_explanation: string;
  key_takeaway: string;
  page_references: number[];
  exact_quote_snippet: string;
}

export interface ChapterBreakdown {
  chapter_summary: string;
  detected_topics: TopicItem[];
}

export interface GroundedAnswer {
  is_available_in_material: boolean;
  answer_text: string;
  cited_pages: number[];
  supporting_quote?: string | null;
  created_at?: string | null;
}

export interface QuizOption {
  option_id: string;
  option_text: string;
  is_correct?: boolean;
  misconception_diagnosis?: string;
}

export interface QuizQuestion {
  question_id: string;
  topic_title: string;
  question_text: string;
  source_page: number;
  source_passage_snippet: string;
  options: QuizOption[];
  explanation?: string;
  difficulty?: string;
}

export interface QuizGeneration {
  questions: QuizQuestion[];
  total_questions: number;
}

export interface QuizSubmissionRequest {
  student_id: string;
  attempt_type?: string;
  answers: Record<string, string>;
  confidences: Record<string, ConfidenceLevel>;
  baseline_attempt_id?: string | null;
}

export interface AttemptAnswer {
  question_id: string;
  topic: string;
  question_text: string;
  selected_option: string;
  correct_option: string;
  is_correct: boolean;
  confidence: ConfidenceLevel;
  classification: string;
  explanation: string;
  source_page: number;
  source_snippet: string;
}

export interface TopicDiagnosticSummary {
  topic_title: string;
  total_questions: number;
  questions_attempted: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  accuracy_pct: number;
  priority_level: PriorityLevel;
  category_counts: Record<string, number>;
  source_pages: number[];
}

export interface DiagnosticAttempt {
  id: string;
  task_id: string;
  student_id: string;
  attempt_number: number;
  attempt_type: 'diagnostic' | 'followup';
  score_pct: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  total_questions: number;
  baseline_attempt_id?: string | null;
  created_at: string;
  answers: AttemptAnswer[];
  topic_summaries: Record<string, TopicDiagnosticSummary>;
  diagnostic_counts: Record<string, number>;
  weak_topics: string[];
}

export interface RevisionItem {
  id: string;
  plan_id: string;
  topic: string;
  priority: PriorityLevel;
  why_you_struggled: string;
  simplified_reteach: string;
  must_read_pages: number[];
  key_quote: string;
  quick_memory_hook: string;
  learning_objective: string;
  recommended_action: string;
  practice_activity: string;
  estimated_minutes: number;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface RevisionPlan {
  id: string;
  task_id: string;
  student_id: string;
  attempt_id: string;
  version: number;
  priority_order: string[];
  spoken_script?: string | null;
  created_at: string;
  items: RevisionItem[];
  completed_count: number;
  total_count: number;
}

export interface TopicMasteryComparison {
  topic: string;
  baseline_accuracy_pct?: number | null;
  followup_accuracy_pct: number;
  accuracy_delta_pct?: number | null;
  status: 'Mastered' | 'Improved' | 'Needs Attention' | 'Fragile';
}

export interface MasteryComparison {
  baseline_attempt?: DiagnosticAttempt | null;
  followup_attempt: DiagnosticAttempt;
  score_delta_pct?: number | null;
  accuracy_diff_percentage_points?: number | null;
  topic_comparisons: TopicMasteryComparison[];
  summary_message: string;
}

export interface TeachBackResult {
  topic: string;
  passed: boolean;
  accuracy_score: number;
  what_you_nailed: string;
  conceptual_gaps: string;
  actionable_feedback: string;
  cited_pages: number[];
}

export interface ProviderStatus {
  provider_id: string;
  name: string;
  is_configured: boolean;
  status: string;
  configured_model?: string | null;
  supported_capabilities: string[];
  masked_key?: string | null;
}

export interface TestConnectionResult {
  provider_id: string;
  success: boolean;
  message: string;
  latency_ms?: number | null;
  model_used?: string | null;
}
