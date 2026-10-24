// ==========================================
// LearnMate API TypeScript Types
// Strictly matched against FastAPI backend schemas
// ==========================================

export interface ApiResponse<T> {
  data: T;
  meta: {
    request_id: string;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta: {
    request_id: string;
  };
}

// ---------------- System & Health ----------------
export interface HealthData {
  status: 'ok' | 'degraded' | string;
  database: string;
  timestamp: string;
}

export interface ConfigStatusData {
  gemini_configured: boolean;
  model: string;
  database_status: string;
  max_pdf_pages: number;
  max_upload_mb: number;
  environment: string;
}

export interface DemoResetData {
  status: string;
  student_id: string;
  message: string;
}

// ---------------- Study Materials ----------------
export interface MaterialData {
  id: string;
  student_id: string;
  title: string;
  material_type: 'pdf' | 'text' | string;
  page_count: number;
  char_count: number;
  processing_status: 'completed' | 'processing' | 'failed' | string;
  created_at: string;
  updated_at: string;
}

export interface MaterialDetailData extends MaterialData {
  chunk_count: number;
}

export interface MaterialChunkItem {
  id: string;
  page_number: number | null;
  section_reference: string | null;
  chunk_position: number;
  content: string;
  char_length: number;
}

export interface MaterialContentData {
  id: string;
  title: string;
  material_type: string;
  page_count: number;
  chunks: MaterialChunkItem[];
}

export interface MaterialListResponse {
  materials: MaterialData[];
  total: number;
}

export interface MaterialDeleteData {
  id: string;
  deleted: boolean;
  message: string;
}

// ---------------- AI Tutor ----------------
export interface TutorAskRequest {
  material_id: string;
  question: string;
  learning_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface SourceReference {
  page_number?: number | null;
  section_reference?: string | null;
  excerpt: string;
}

export interface TutorData {
  answer: string;
  sources: SourceReference[];
  grounded: boolean;
  insufficient_evidence: boolean;
  follow_up_questions: string[];
}

// ---------------- Quizzes & Practice ----------------
export interface QuizCreateRequest {
  material_id: string;
  quiz_type?: 'diagnostic' | 'practice' | 'follow_up';
  topic?: string;
  question_count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestionPublic {
  id: string;
  question_number: number;
  prompt: string;
  question_type: string;
  options: string[];
  topic?: string | null;
}

export interface QuizData {
  id: string;
  material_id?: string | null;
  quiz_type: string;
  topic?: string | null;
  difficulty: string;
  question_count: number;
  questions: QuizQuestionPublic[];
  created_at: string;
}

export interface AnswerSubmission {
  question_id: string;
  selected_option: string;
}

export interface QuizSubmitRequest {
  answers: AnswerSubmission[];
}

export interface QuestionEvaluation {
  question_id: string;
  question_number: number;
  prompt: string;
  selected_option: string;
  correct_option: string;
  is_correct: boolean;
  explanation: string;
  topic?: string | null;
}

export interface TopicPerformance {
  topic: string;
  total: number;
  correct: number;
  percentage: number;
}

export interface UpdatedMasteryIndicator {
  topic: string;
  accuracy: number;
  status: 'weak' | 'developing' | 'strong' | 'not_enough_data' | string;
  confidence: string;
  recommended_action: string;
}

export interface QuizResultData {
  quiz_id: string;
  attempt_id: string;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  questions: QuestionEvaluation[];
  topic_performance: TopicPerformance[];
  recommended_next_action: string;
  updated_mastery: UpdatedMasteryIndicator[];
}

export interface QuizAttemptItem {
  id: string;
  quiz_id: string;
  quiz_type: string;
  topic: string;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  submitted_at: string;
}

// ---------------- Analytics & Progress ----------------
export interface KnowledgeGapItem {
  topic: string;
  accuracy: number;
  attempts_count: number;
  confidence: 'low' | 'medium' | 'high' | string;
  status: 'weak' | 'developing' | 'strong' | 'not_enough_data' | string;
  recommended_action: string;
}

export interface KnowledgeGapList {
  topics: KnowledgeGapItem[];
  total_topics: number;
}

export interface MisconceptionItem {
  id: string;
  topic: string;
  misconception_text: string;
  evidence_question: string;
  evidence_answer: string;
  suggested_practice: string;
  confidence: string;
  detected_at: string;
}

export interface MisconceptionList {
  misconceptions: MisconceptionItem[];
  total_misconceptions: number;
}

export interface ActivityItem {
  type: 'material_upload' | 'quiz_attempt' | 'task_completed' | string;
  title: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface VerificationData {
  id: string;
  topic: string;
  material_id?: string | null;
  diagnostic_quiz_id?: string | null;
  follow_up_quiz_id?: string | null;
  initial_score?: number | null;
  follow_up_score?: number | null;
  score_difference?: number | null;
  status: 'completed' | 'awaiting_follow_up' | string;
  assessment_ids: {
    diagnostic_quiz_id?: string | null;
    follow_up_quiz_id?: string | null;
  };
  message: string;
}

export interface VerificationCreateRequest {
  topic: string;
  material_id?: string;
}

export interface ProgressData {
  total_materials: number;
  total_quizzes: number;
  total_attempts: number;
  average_score: number;
  questions_answered: number;
  recent_activity: ActivityItem[];
  topic_trends: KnowledgeGapItem[];
  verifications: VerificationData[];
}

// ---------------- Revision Planner ----------------
export interface RevisionTaskItem {
  id: string;
  title: string;
  topic: string;
  priority: 'high' | 'medium' | 'low' | string;
  reason: string;
  suggested_activity: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionPlanData {
  tasks: RevisionTaskItem[];
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
}

export interface RevisionTaskUpdate {
  status: 'pending' | 'in_progress' | 'completed';
}
