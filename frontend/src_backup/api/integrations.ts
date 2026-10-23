import { api } from './client';
import type { ProviderStatus, TestConnectionResult } from '@/types';

export interface BackendHealthResponse {
  status: string;
  database: string;
  timestamp: string;
}

export interface BackendConfigStatus {
  app_name: string;
  environment: string;
  default_model: string;
  gemini_api_key_configured: boolean;
  allowed_origins: string[];
  upload_max_file_size_mb: number;
  default_student_id: string;
}

export const integrationsApi = {
  getHealth: () => api.get<BackendHealthResponse>('/health'),

  getConfigStatus: () => api.get<BackendConfigStatus>('/config/status'),

  resetDemo: () => api.post<{ status: string; message: string; records_seeded: Record<string, number> }>('/demo/reset'),

  getStatus: () => api.get<Record<string, any>>('/config/status'),

  getProviders: () => api.get<ProviderStatus[]>('/integrations/providers'),

  testProvider: (data: { provider_id: string; api_key?: string; model?: string }) =>
    api.post<TestConnectionResult>('/integrations/test', data),

  getFeatures: () => api.get<Record<string, string>>('/integrations/features'),
};
