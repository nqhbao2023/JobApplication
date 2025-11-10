import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { Job } from '@/types';

export interface SavedJob {
  id: string;
  jobId: string;
  savedAt: string;
  job?: Job;
}

export const savedJobApiService = {
  async getSavedJobs(): Promise<SavedJob[]> {
    return apiClient.get<SavedJob[]>(API_ENDPOINTS.savedJobs.list);
  },

  async saveJob(jobId: string): Promise<SavedJob> {
    return apiClient.post<SavedJob>(API_ENDPOINTS.savedJobs.save(jobId));
  },

  async removeJob(jobId: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.savedJobs.remove(jobId));
  },
};
