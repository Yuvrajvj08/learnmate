import { api } from './client';
import type { StudentProfile } from '@/types';

export const profilesApi = {
  list: () => api.get<StudentProfile[]>('/profiles'),
  
  create: (data: { display_name: string; preferred_language?: string }) =>
    api.post<StudentProfile>('/profiles', data),
    
  get: (id: string) => api.get<StudentProfile>(`/profiles/${id}`),
  
  update: (id: string, data: { display_name?: string; preferred_language?: string }) =>
    api.patch<StudentProfile>(`/profiles/${id}`, data),
};
