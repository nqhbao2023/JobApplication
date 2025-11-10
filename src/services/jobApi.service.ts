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

// ✅ CreateJobPayload: Format dữ liệu để tạo job mới (theo API schema)
interface CreateJobPayload {
  title: string;
  company: string;
  companyId: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary: {
    min: number;
    max: number;
    currency: 'VND' | 'USD';
  };
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  category: string;
  status?: 'active' | 'inactive' | 'closed';
  expiresAt?: string;
}

export const jobApiService = {
  async getAllJobs(params?: GetJobsParams): Promise<GetJobsResponse> {
    return apiClient.get<GetJobsResponse>(API_ENDPOINTS.jobs, { params });
  },

  async getJobById(id: string): Promise<Job> {
    return apiClient.get<Job>(`${API_ENDPOINTS.jobs}/${id}`);
  },

  async createJob(jobData: CreateJobPayload): Promise<Job> {
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

