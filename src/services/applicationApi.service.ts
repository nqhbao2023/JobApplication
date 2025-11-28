import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

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
    const result = await apiClient.get<Application[]>(API_ENDPOINTS.applications.my);
    // ✅ Ensure we always return an array
    return Array.isArray(result) ? result : [];
  },

  async getEmployerApplications(): Promise<Application[]> {
    const result = await apiClient.get<Application[]>(API_ENDPOINTS.applications.employer);
    // ✅ Ensure we always return an array
    return Array.isArray(result) ? result : [];
  },

  async getJobApplications(jobId: string): Promise<Application[]> {
    const result = await apiClient.get<Application[]>(API_ENDPOINTS.applications.byJob(jobId));
    // ✅ Ensure we always return an array
    return Array.isArray(result) ? result : [];
  },
  async updateApplication(
    id: string,
    data: Partial<Pick<Application, 'cvUrl' | 'coverLetter'>>
  ): Promise<Application> {
    return apiClient.patch<Application>(API_ENDPOINTS.applications.update(id), data);
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

