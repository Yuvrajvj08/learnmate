import { api, request } from './client';
import type {
  MaterialData,
  MaterialDetailData,
  MaterialContentData,
  MaterialListResponse,
  MaterialDeleteData,
} from './types';

export const materialsApi = {
  /**
   * Upload and index a PDF document page-by-page.
   */
  uploadPdf: async (file: File, title?: string): Promise<MaterialData> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }

    return request<MaterialData>('/materials', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Submit pasted study text or lecture notes.
   */
  createNotes: async (title: string, content: string): Promise<MaterialData> => {
    return api.post<MaterialData>('/materials/text', {
      title: title.trim(),
      content: content.trim(),
    });
  },

  /**
   * List study materials with pagination.
   */
  list: async (limit: number = 20, offset: number = 0): Promise<MaterialListResponse> => {
    return api.get<MaterialListResponse>('/materials', { limit, offset });
  },

  /**
   * Get material metadata and chunk counts.
   */
  getById: async (id: string): Promise<MaterialDetailData> => {
    return api.get<MaterialDetailData>(`/materials/${id}`);
  },

  /**
   * Get extracted content with chunks and page numbers.
   */
  getContent: async (id: string): Promise<MaterialContentData> => {
    return api.get<MaterialContentData>(`/materials/${id}/content`);
  },

  /**
   * Rename study material title.
   */
  rename: async (id: string, title: string): Promise<MaterialData> => {
    return api.patch<MaterialData>(`/materials/${id}`, { title: title.trim() });
  },

  /**
   * Delete study material and associated chunks.
   */
  delete: async (id: string): Promise<MaterialDeleteData> => {
    return api.delete<MaterialDeleteData>(`/materials/${id}`);
  },
};
