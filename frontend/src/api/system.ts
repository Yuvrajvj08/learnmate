import { api } from './client';
import type { HealthData, ConfigStatusData, DemoResetData } from './types';

export const systemApi = {
  /**
   * System health and readiness check.
   */
  getHealth: async (): Promise<HealthData> => {
    return api.get<HealthData>('/health');
  },

  /**
   * Safe configuration status (Gemini readiness, limits, environment).
   */
  getConfigStatus: async (): Promise<ConfigStatusData> => {
    return api.get<ConfigStatusData>('/config/status');
  },

  /**
   * Reset demo data for student (development only).
   */
  resetDemoData: async (): Promise<DemoResetData> => {
    return api.post<DemoResetData>('/demo/reset');
  },
};
