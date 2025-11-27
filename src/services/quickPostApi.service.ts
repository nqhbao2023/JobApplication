import apiClient from './apiClient';

export type JobTypeMode = 'candidate_seeking' | 'employer_seeking';

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
  image?: string; // ✅ Optional image URL for quick post
  jobType?: JobTypeMode; // ✅ 'candidate_seeking' or 'employer_seeking'
  posterId?: string; // ✅ UID of poster if logged in
  // ✅ NEW: Candidate seeking specific fields
  cvUrl?: string; // Link CV (Google Drive, Dropbox, etc.)
  expectedSalary?: string; // Mức lương mong muốn
  availableSchedule?: string[]; // Thời gian có thể làm việc
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
  status: 'active' | 'inactive'; // ✅ Fixed: Changed 'pending' to 'inactive' to match backend
  metadata?: {
    ip: string;
    userAgent: string;
    timestamp: string;
  };
  spamScore?: number;
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
