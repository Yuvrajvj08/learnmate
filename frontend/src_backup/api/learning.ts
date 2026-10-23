import { api } from './client';
import type { ChapterBreakdown, GroundedAnswer } from '@/types';

export interface TutorAskPayload {
  student_id: string;
  question: string;
  material_id?: string;
  language?: string;
}

export const learningApi = {
  // Real FastAPI endpoint: POST /tutor/ask
  askTutor: (payload: TutorAskPayload) =>
    api.post<GroundedAnswer>('/tutor/ask', {
      student_id: payload.student_id || 'demo-student-001',
      question: payload.question,
      material_id: payload.material_id,
    }),

  askQuestion: async (
    taskId: string,
    data: { student_id: string; question: string; language?: string }
  ) => {
    try {
      return await api.post<GroundedAnswer>(`/tasks/${taskId}/questions`, data);
    } catch {
      // Forward directly to real FastAPI backend /tutor/ask
      return await learningApi.askTutor({
        student_id: data.student_id,
        question: data.question,
        language: data.language,
      });
    }
  },

  generateBreakdown: (taskId: string) =>
    api.post<ChapterBreakdown>(`/tasks/${taskId}/generate-learning-content`),

  getBreakdown: (taskId: string) =>
    api.get<ChapterBreakdown>(`/tasks/${taskId}/learning-content`),
};
