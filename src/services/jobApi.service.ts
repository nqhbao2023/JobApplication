import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { Job } from '@/types';

interface GetJobsParams {
  status?: string;
  category?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

interface GetJobsResponse {
  jobs: Job[];
  total: number;
}

export const jobApiService = {
  async getAllJobs(params?: GetJobsParams): Promise<GetJobsResponse> {
    return apiClient.get<GetJobsResponse>(API_ENDPOINTS.jobs, params);
  },

  async getJobById(id: string): Promise<Job> {
    return apiClient.get<Job>(`${API_ENDPOINTS.jobs}/${id}`);
  },

  async createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    return apiClient.post<Job>(API_ENDPOINTS.jobs, jobData);
  },

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    return apiClient.put<Job>(`${API_ENDPOINTS.jobs}/${id}`, updates);
  },

  async deleteJob(id: string): Promise<void> {
    return apiClient.delete<void>(`${API_ENDPOINTS.jobs}/${id}`);
  },

  async getMyJobs(): Promise<Job[]> {
    return apiClient.get<Job[]>(API_ENDPOINTS.myJobs);
  },
};

