import apiClient from './apiClient';
import { CVData } from '@/types/cv.types';

export type JobTypeMode = 'candidate_seeking' | 'employer_seeking';

/**
 * CV Data structure for Quick Post
 * Supports 3 types:
 * 1. 'template' - CV created from CV builder (with full snapshot)
 * 2. 'external' - External link (Google Drive, Dropbox, etc.)
 * 3. 'none' - No CV attached
 */
export interface QuickPostCVData {
  type: 'template' | 'external' | 'none';
  
  // For type = 'template': Full CV snapshot (so employer can view even if candidate edits/deletes CV later)
  cvId?: string; // Reference to original CV in user_cvs collection
  cvSnapshot?: CVData; // Complete copy of CV data at submission time
  
  // For type = 'external': Just the URL
  externalUrl?: string; // Google Drive, Dropbox, etc.
  
  // Metadata
  attachedAt?: string; // ISO timestamp when CV was attached
}

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
  
  // ✅ NEW: Structured CV data (replaces simple cvUrl)
  cvData?: QuickPostCVData;
  
  // ✅ DEPRECATED: Keep for backward compatibility with old quick posts
  cvUrl?: string; // Old field - will be migrated to cvData.externalUrl
  
  // ✅ Candidate seeking specific fields
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
  cvData?: QuickPostCVData; // ✅ Ensure cvData is included in response type
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
