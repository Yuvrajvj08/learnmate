import { api } from './client';
import type { RevisionPlan, RevisionItem } from '@/types';

export const revisionsApi = {
  // Real FastAPI endpoints:
  getBackendPlan: (studentId: string = 'demo-student-001') =>
    api.get<any>(`/revision-plan?student_id=${encodeURIComponent(studentId)}`),

  generateBackendPlan: (studentId: string = 'demo-student-001') =>
    api.post<any>('/revision-plan/generate', { student_id: studentId }),

  updateItemStatus: (itemId: string, status: 'completed' | 'pending' | 'in_progress') =>
    api.patch<any>(`/revision-plan/${itemId}`, { status }),

  // Fallbacks / legacy task methods:
  generatePlan: async (
    taskId: string,
    data: { student_id: string; attempt_id?: string }
  ) => {
    try {
      return await api.post<RevisionPlan>(`/tasks/${taskId}/revision-plans`, data);
    } catch {
      const res = await revisionsApi.generateBackendPlan(data.student_id);
      return {
        id: res.id || `plan_${Date.now()}`,
        task_id: taskId,
        items: res.items || [],
        created_at: new Date().toISOString(),
      } as RevisionPlan;
    }
  },

  listPlans: async (taskId: string) => {
    try {
      return await api.get<RevisionPlan[]>(`/tasks/${taskId}/revision-plans`);
    } catch {
      const plan = await revisionsApi.getBackendPlan();
      return plan ? [plan] : [];
    }
  },

  getPlan: (planId: string) =>
    api.get<RevisionPlan>(`/revision-plans/${planId}`),

  toggleItem: async (itemId: string, isCompleted: boolean) => {
    try {
      return await api.patch<RevisionItem>(`/revision-items/${itemId}`, {
        is_completed: isCompleted,
      });
    } catch {
      return await revisionsApi.updateItemStatus(itemId, isCompleted ? 'completed' : 'pending');
    }
  },
};
