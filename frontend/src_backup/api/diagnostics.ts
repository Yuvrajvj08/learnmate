import { api } from './client';
import type {
  QuizGeneration,
  QuizSubmissionRequest,
  DiagnosticAttempt,
} from '@/types';

export interface BackendCreateQuizPayload {
  material_id?: string;
  topic?: string;
  num_questions?: number;
  student_id?: string;
}

export interface BackendQuizSubmissionPayload {
  answers: Array<{
    question_id: string;
    selected_option: string;
    confidence_level: 'high' | 'medium' | 'low';
  }>;
  time_taken_seconds?: number;
  student_id?: string;
}

export const diagnosticsApi = {
  // Real FastAPI endpoints:
  createQuiz: (payload: BackendCreateQuizPayload) =>
    api.post<any>('/quizzes', {
      student_id: payload.student_id || 'demo-student-001',
      topic: payload.topic || 'General Practice',
      num_questions: payload.num_questions || 5,
      material_id: payload.material_id,
    }),

  submitQuiz: (quizId: string, payload: BackendQuizSubmissionPayload) =>
    api.post<any>(`/quizzes/${quizId}/submit`, {
      student_id: payload.student_id || 'demo-student-001',
      answers: payload.answers,
      time_taken_seconds: payload.time_taken_seconds || 60,
    }),

  // Fallbacks / existing interface methods
  generateQuiz: async (taskId: string, count: number = 8): Promise<QuizGeneration> => {
    try {
      return await api.post<QuizGeneration>(`/tasks/${taskId}/diagnostics/generate?count=${count}`);
    } catch {
      const res = await diagnosticsApi.createQuiz({
        num_questions: count,
        topic: 'Adaptive Diagnostic Practice',
      });
      const questions = (res?.questions || []).map((q: any, idx: number) => ({
        question_id: q.question_id || `q_${idx}`,
        topic_title: res.topic || 'Core Knowledge',
        question_text: q.question_text || q.text || '',
        source_page: 1,
        source_passage_snippet: '',
        options: (q.options || []).map((opt: any, oIdx: number) => ({
          option_id: typeof opt === 'string' ? String.fromCharCode(65 + oIdx) : opt.option_id || `${oIdx}`,
          option_text: typeof opt === 'string' ? opt : opt.option_text || '',
        })),
      }));
      return {
        questions,
        total_questions: questions.length,
      } as unknown as QuizGeneration;
    }
  },

  submitAttempt: async (taskId: string, submission: QuizSubmissionRequest): Promise<DiagnosticAttempt> => {
    try {
      return await api.post<DiagnosticAttempt>(`/tasks/${taskId}/diagnostics/submit`, submission);
    } catch {
      const answersList = Object.entries(submission.answers || {}).map(([qId, val]) => {
        const conf = submission.confidences?.[qId] || 'Medium';
        return {
          question_id: qId,
          selected_option: val,
          confidence_level: (conf.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
        };
      });
      const res = await diagnosticsApi.submitQuiz(taskId, { answers: answersList });
      return {
        id: res?.submission_id || `sub_${Date.now()}`,
        task_id: taskId,
        student_id: submission.student_id,
        attempt_number: 1,
        attempt_type: 'diagnostic',
        score_pct: res?.score ?? 0,
        correct_count: res?.correct_count ?? 0,
        incorrect_count: (res?.total_questions || 0) - (res?.correct_count || 0),
        unanswered_count: 0,
        total_questions: res?.total_questions ?? answersList.length,
        created_at: new Date().toISOString(),
        answers: [],
        topic_summaries: {},
        diagnostic_counts: res?.quadrant_distribution || {},
        weak_topics: [],
      } as unknown as DiagnosticAttempt;
    }
  },

  listAttempts: (taskId: string) =>
    api.get<DiagnosticAttempt[]>(`/tasks/${taskId}/diagnostics`),

  getAttempt: (attemptId: string) =>
    api.get<DiagnosticAttempt>(`/attempts/${attemptId}`),
};
