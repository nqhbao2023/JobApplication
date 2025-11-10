import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { Job } from '@/types';

export interface Application {
  id?: string;
  jobId: string;
  candidateId: string;
  employerId: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  cvUrl?: string;
  coverLetter?: string;
  appliedAt: Date | string | number;
  updatedAt: Date | string | number;
  job?: Job;
}

interface CreateApplicationData {
  jobId: string;
  employerId: string;
  cvUrl?: string;
  coverLetter?: string;
}

export const applicationApiService = {
  async createApplication(data: CreateApplicationData): Promise<Application> {
    return apiClient.post<Application>(API_ENDPOINTS.applications.create, data);
  },

  async getMyApplications(): Promise<Application[]> {
    return apiClient.get<Application[]>(API_ENDPOINTS.applications.my);
  },

  async getEmployerApplications(): Promise<Application[]> {
    return apiClient.get<Application[]>(API_ENDPOINTS.applications.employer);
  },

  async getJobApplications(jobId: string): Promise<Application[]> {
    return apiClient.get<Application[]>(API_ENDPOINTS.applications.byJob(jobId));
  },

  async updateApplicationStatus(
    id: string,
    status: Application['status']
  ): Promise<Application> {
    return apiClient.patch<Application>(
      API_ENDPOINTS.applications.updateStatus(id),
      { status }
    );
  },

  async withdrawApplication(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.applications.withdraw(id));
  },
};

