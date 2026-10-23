import { api } from './client';
import type {
  KnowledgeGapList,
  MisconceptionList,
  ProgressData,
  VerificationCreateRequest,
  VerificationData,
} from './types';

export const analyticsApi = {
  /**
   * Retrieve topic-level mastery estimates and knowledge gaps.
   */
  getKnowledgeGaps: async (): Promise<KnowledgeGapList> => {
    return api.get<KnowledgeGapList>('/analytics/knowledge-gaps');
  },

  /**
   * Retrieve diagnosed student misconceptions grounded in actual incorrect answers.
   */
  getMisconceptions: async (): Promise<MisconceptionList> => {
    return api.get<MisconceptionList>('/analytics/misconceptions');
  },

  /**
   * Retrieve overall learning progress, quiz scores, topic trends, and recent activity.
   */
  getProgress: async (): Promise<ProgressData> => {
    return api.get<ProgressData>('/analytics/progress');
  },

  /**
   * Initiate a verification session comparing initial diagnostic and follow-up assessments.
   */
  createVerification: async (params: {
    topic: string;
    material_id?: string;
  }): Promise<VerificationData> => {
    const payload: VerificationCreateRequest = {
      topic: params.topic.trim(),
      material_id: params.material_id || undefined,
    };
    return api.post<VerificationData>('/analytics/verification', payload);
  },

  /**
   * Retrieve assessment verification results and score delta.
   */
  getVerificationById: async (verificationId: string): Promise<VerificationData> => {
    return api.get<VerificationData>(`/analytics/verification/${verificationId}`);
  },
};
