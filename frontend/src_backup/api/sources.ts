import { api, request } from './client';
import type { SourceChunk, TopicItem } from '@/types';

export interface StudyMaterial {
  id: string;
  student_id: string;
  title: string;
  filename?: string;
  content_type: string;
  total_pages?: number;
  total_words?: number;
  chunks_count: number;
  created_at: string;
}

export const sourcesApi = {
  // Real FastAPI backend endpoints
  uploadMaterialPdf: async (file: File, studentId: string = 'demo-student-001') => {
    const formData = new FormData();
    formData.append('file', file);
    return request<StudyMaterial>(`/materials?student_id=${encodeURIComponent(studentId)}`, {
      method: 'POST',
      body: formData,
    });
  },

  pasteMaterialText: (data: {
    title: string;
    content: string;
    student_id?: string;
  }) =>
    api.post<StudyMaterial>('/materials/text', {
      student_id: data.student_id || 'demo-student-001',
      title: data.title,
      content: data.content,
    }),

  listMaterials: async (studentId: string = 'demo-student-001'): Promise<StudyMaterial[]> => {
    const res = await api.get<any>(`/materials?student_id=${encodeURIComponent(studentId)}`);
    if (res && Array.isArray(res.materials)) {
      return res.materials;
    }
    return Array.isArray(res) ? res : [];
  },

  getMaterialContent: (materialId: string) =>
    api.get<{ material: StudyMaterial; chunks: SourceChunk[] }>(`/materials/${materialId}/content`),

  deleteMaterial: (materialId: string) =>
    api.delete<{ success: boolean; message: string }>(`/materials/${materialId}`),

  // Fallback / legacy task-scoped methods
  uploadPdf: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      return await request<{
        task_id: string;
        filename: string;
        total_pages: number;
        total_words: number;
        chunks_created: number;
      }>(`/tasks/${taskId}/upload`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      // Connect to real backend /materials
      const res = await sourcesApi.uploadMaterialPdf(file);
      return {
        task_id: taskId,
        filename: res.filename || file.name,
        total_pages: res.total_pages || 1,
        total_words: res.total_words || 0,
        chunks_created: res.chunks_count || 1,
      };
    }
  },

  pasteText: async (
    taskId: string,
    data: { raw_text: string; title?: string; subject?: string }
  ) => {
    try {
      return await api.post<{
        task_id: string;
        total_virtual_pages: number;
        total_words: number;
        chunks_created: number;
      }>(`/tasks/${taskId}/paste`, data);
    } catch {
      const res = await sourcesApi.pasteMaterialText({
        title: data.title || 'Study Notes',
        content: data.raw_text,
      });
      return {
        task_id: taskId,
        total_virtual_pages: 1,
        total_words: res.total_words || 0,
        chunks_created: res.chunks_count || 1,
      };
    }
  },

  getSources: async (taskId: string) => {
    try {
      return await api.get<SourceChunk[]>(`/tasks/${taskId}/sources`);
    } catch {
      const materials = await sourcesApi.listMaterials();
      return materials.map((m, idx) => ({
        id: m.id,
        chunk_index: idx,
        content: `Study Material: ${m.title}`,
        page_number: m.total_pages || 1,
        created_at: m.created_at,
      }));
    }
  },

  getTopics: (taskId: string) =>
    api.get<TopicItem[]>(`/tasks/${taskId}/topics`),
};
