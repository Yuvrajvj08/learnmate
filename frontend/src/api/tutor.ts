import { api } from './client';
import type { TutorAskRequest, TutorData } from './types';

export const tutorApi = {
  /**
   * Ask AI Tutor a question grounded strictly in a study material.
   * Returns grounded answers with source citations, or abstains if evidence is insufficient.
   */
  ask: async (
    materialId: string,
    question: string,
    learningLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<TutorData> => {
    const payload: TutorAskRequest = {
      material_id: materialId,
      question: question.trim(),
      learning_level: learningLevel,
    };
    return api.post<TutorData>('/tutor/ask', payload);
  },
};
