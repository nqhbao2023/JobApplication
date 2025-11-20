import apiClient from './apiClient';

export interface QuickPostJobData {
  title: string;
  description: string;
  company?: string;
  location: string;
  salary?: string;
  hourlyRate?: number;
  workSchedule?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  category?: string;
  contactInfo: {
    phone?: string;
    zalo?: string;
    facebook?: string;
    email?: string;
  };
}

export interface QuickPostJob extends QuickPostJobData {
  id: string;
  jobSource: 'quick-post';
  isVerified: boolean;
  status: 'active' | 'inactive' | 'pending';
  createdAt: any;
  updatedAt: any;
}

export const quickPostService = {
  /**
   * Create Quick Post Job (No authentication required)
   */
  async createQuickPost(jobData: QuickPostJobData): Promise<QuickPostJob> {
    const response = await apiClient.post<{ message: string; job: QuickPostJob }>(
      '/api/quick-posts',
      jobData
    );
    return response.job;
  },

  /**
   * Get pending quick posts (Admin only)
   */
  async getPendingQuickPosts(): Promise<QuickPostJob[]> {
    const response = await apiClient.get<{ jobs: QuickPostJob[]; count: number }>(
      '/api/quick-posts/pending'
    );
    return response.jobs;
  },

  /**
   * Approve quick post (Admin only)
   */
  async approveQuickPost(jobId: string): Promise<QuickPostJob> {
    const response = await apiClient.patch<{ message: string; job: QuickPostJob }>(
      `/api/quick-posts/${jobId}/approve`
    );
    return response.job;
  },

  /**
   * Reject quick post (Admin only)
   */
  async rejectQuickPost(jobId: string, reason?: string): Promise<void> {
    await apiClient.patch(`/api/quick-posts/${jobId}/reject`, { reason });
  },

  /**
   * Send application notification for quick-post job
   */
  async notifyQuickPostApplication(
    jobId: string,
    candidateData: {
      name: string;
      email: string;
      phone?: string;
      cvUrl?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/api/quick-posts/${jobId}/notify`, candidateData);
  },
};

export default quickPostService;
