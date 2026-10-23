import { api } from './client';
import type {
  QuizGeneration,
  QuizSubmissionRequest,
  MasteryComparison,
  DiagnosticAttempt,
  TeachBackResult,
} from '@/types';

export const masteryApi = {
  // Real FastAPI verification endpoint: POST /analytics/verification
  createVerification: (data: {
    student_id?: string;
    diagnostic_quiz_id: string;
    post_revision_quiz_id: string;
  }) =>
    api.post<any>('/analytics/verification', {
      student_id: data.student_id || 'demo-student-001',
      diagnostic_quiz_id: data.diagnostic_quiz_id,
      post_revision_quiz_id: data.post_revision_quiz_id,
    }),

  getVerification: (verificationId: string) =>
    api.get<any>(`/analytics/verification/${verificationId}`),

  getKnowledgeGaps: (studentId: string = 'demo-student-001') =>
    api.get<any>(`/analytics/knowledge-gaps?student_id=${encodeURIComponent(studentId)}`),

  getMisconceptions: (studentId: string = 'demo-student-001') =>
    api.get<any>(`/analytics/misconceptions?student_id=${encodeURIComponent(studentId)}`),

  getProgressAnalytics: (studentId: string = 'demo-student-001') =>
    api.get<any>(`/analytics/progress?student_id=${encodeURIComponent(studentId)}`),

  // Fallbacks / legacy task methods:
  generateQuiz: (taskId: string, count: number = 6) =>
    api.post<QuizGeneration>(`/tasks/${taskId}/mastery/generate-quiz?count=${count}`),

  submitAttempt: (taskId: string, submission: QuizSubmissionRequest) =>
    api.post<MasteryComparison>(`/tasks/${taskId}/mastery/submit`, submission),

  getHistory: (taskId: string) =>
    api.get<DiagnosticAttempt[]>(`/tasks/${taskId}/mastery/history`),

  teachBack: (
    taskId: string,
    data: {
      student_id: string;
      topic: string;
      explanation_text: string;
      language?: string;
    }
  ) => api.post<TeachBackResult>(`/tasks/${taskId}/mastery/teach-back`, data),
};
