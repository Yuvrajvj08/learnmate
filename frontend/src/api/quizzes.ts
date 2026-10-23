import { api } from './client';
import type {
  QuizCreateRequest,
  QuizData,
  QuizSubmitRequest,
  QuizResultData,
} from './types';

export const quizzesApi = {
  /**
   * Generate a diagnostic, practice, or follow-up multiple-choice quiz grounded in study material.
   */
  create: async (params: {
    material_id: string;
    quiz_type?: 'diagnostic' | 'practice' | 'follow_up';
    topic?: string;
    question_count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  }): Promise<QuizData> => {
    const payload: QuizCreateRequest = {
      material_id: params.material_id,
      quiz_type: params.quiz_type || 'practice',
      topic: params.topic || undefined,
      question_count: params.question_count || 5,
      difficulty: params.difficulty || 'medium',
    };
    return api.post<QuizData>('/quizzes', payload);
  },

  /**
   * Retrieve quiz questions with grading keys safely hidden.
   */
  getById: async (quizId: string): Promise<QuizData> => {
    return api.get<QuizData>(`/quizzes/${quizId}`);
  },

  /**
   * Submit answers for objective server-side evaluation.
   */
  submit: async (
    quizId: string,
    answers: { question_id: string; selected_option: string }[]
  ): Promise<QuizResultData> => {
    const payload: QuizSubmitRequest = { answers };
    return api.post<QuizResultData>(`/quizzes/${quizId}/submit`, payload);
  },
};
