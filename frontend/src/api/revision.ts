import { api } from './client';
import type { RevisionPlanData, RevisionTaskItem, RevisionTaskUpdate } from './types';

export const revisionApi = {
  /**
   * Retrieve current prioritized revision plan.
   */
  getPlan: async (): Promise<RevisionPlanData> => {
    return api.get<RevisionPlanData>('/revision-plan');
  },

  /**
   * Generate or update recommendations using topic mastery and quiz history.
   */
  generatePlan: async (): Promise<RevisionPlanData> => {
    return api.post<RevisionPlanData>('/revision-plan/generate');
  },

  /**
   * Update task status: 'pending', 'in_progress', or 'completed'.
   */
  updateTaskStatus: async (
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<RevisionTaskItem> => {
    const payload: RevisionTaskUpdate = { status };
    return api.patch<RevisionTaskItem>(`/revision-plan/${taskId}`, payload);
  },
};
