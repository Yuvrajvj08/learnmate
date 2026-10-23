import { api } from './client';
import { sourcesApi } from './sources';
import type { TaskSummary, TaskDetails, SourceType } from '@/types';

export const tasksApi = {
  list: async (studentId?: string): Promise<TaskSummary[]> => {
    try {
      const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
      return await api.get<TaskSummary[]>(`/tasks${query}`);
    } catch {
      // Connect to real FastAPI /materials endpoint
      const materials = await sourcesApi.listMaterials(studentId || 'demo-student-001');
      return materials.map((m: any) => ({
        id: m.id,
        student_id: m.student_id || 'demo-student-001',
        title: m.title || 'Study Material',
        subject: 'General Science',
        source_type: (m.material_type === 'pdf' || m.content_type?.includes('pdf')) ? 'pdf' : 'pasted_text',
        total_pages: m.page_count || m.total_pages || 1,
        current_stage: 1,
        progress_pct: 25,
        latest_score_pct: null,
        topics_count: m.chunks_count || 1,
        attempts_count: 0,
        created_at: m.created_at || new Date().toISOString(),
        updated_at: m.updated_at || m.created_at || new Date().toISOString(),
      }));
    }
  },

  create: async (data: {
    student_id: string;
    title: string;
    subject?: string;
    source_type?: SourceType;
  }): Promise<TaskDetails> => {
    try {
      return await api.post<TaskDetails>('/tasks', data);
    } catch {
      const note = await sourcesApi.pasteMaterialText({
        title: data.title,
        content: `Study topic initialized for ${data.title} in ${data.subject || 'General'}.`,
        student_id: data.student_id,
      });
      return {
        id: note.id,
        student_id: data.student_id,
        title: data.title,
        subject: data.subject || 'General',
        source_type: data.source_type || 'pasted_text',
        total_pages: 1,
        current_stage: 1,
        progress_pct: 0,
        source_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  get: async (id: string): Promise<TaskDetails> => {
    try {
      return await api.get<TaskDetails>(`/tasks/${id}`);
    } catch {
      const content = await sourcesApi.getMaterialContent(id).catch(() => null);
      const title = content?.material?.title || 'Study Workspace';
      return {
        id,
        student_id: 'demo-student-001',
        title,
        subject: 'General Science',
        source_type: 'pasted_text',
        total_pages: content?.material?.total_pages || 1,
        current_stage: 1,
        progress_pct: 25,
        source_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  update: (
    id: string,
    data: {
      title?: string;
      subject?: string;
      current_stage?: number;
      progress_pct?: number;
    }
  ) => api.patch<TaskDetails>(`/tasks/${id}`, data),

  delete: async (id: string) => {
    try {
      return await api.delete<{ message: string }>(`/tasks/${id}`);
    } catch {
      return await sourcesApi.deleteMaterial(id);
    }
  },

  getProgress: (id: string) => api.get<any>(`/tasks/${id}/progress`),
};
