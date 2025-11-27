import { db } from '../config/firebase';
import { Job } from '../types';
import { FieldValue } from 'firebase-admin/firestore';
import emailService from './email.service';

class QuickPostService {
  private jobsCollection = db.collection('jobs');

  /**
   * Create Quick Post Job (không cần auth)
   */
  async createQuickPost(jobData: Partial<Job>): Promise<Job> {
    // Validate required fields
    if (!jobData.title || !jobData.description || !jobData.contactInfo) {
      throw new Error('Missing required fields: title, description, contactInfo');
    }

    if (!jobData.contactInfo.phone && !jobData.contactInfo.email) {
      throw new Error('At least phone or email is required');
    }

    const now = FieldValue.serverTimestamp();
    const newJob: Partial<Job> = {
      ...jobData,
      source: 'quick-post', // ✅ Source identifier
      jobSource: 'quick-post', // Legacy field
      jobType: 'candidate_seeking', // ✅ NEW: Candidate tìm việc → Employer xem
      posterId: jobData.posterId || undefined, // ✅ NEW: UID người đăng (undefined nếu anonymous)
      isVerified: false,
      status: 'inactive', // Chờ admin duyệt
      employerId: 'quick-post-user', // Placeholder
      companyId: jobData.company || 'unknown',
      createdAt: now,
      updatedAt: now,
      expiresAt: FieldValue.serverTimestamp(), // Expire sau 30 ngày
    };

    const docRef = await this.jobsCollection.add(newJob);
    const doc = await docRef.get();
    
    // Send confirmation email to poster
    if (jobData.contactInfo?.email) {
      await emailService.sendQuickPostConfirmation(
        jobData.contactInfo.email,
        jobData.title || 'Tin tuyển dụng mới'
      ).catch(err => console.error('Failed to send confirmation email:', err));
    }
    
    return { id: doc.id, ...doc.data() } as Job;
  }

  /**
   * Get all pending quick posts
   */
  async getPendingQuickPosts(): Promise<Job[]> {
    // Simplified query to avoid index requirement
    const snapshot = await this.jobsCollection
      .where('jobSource', '==', 'quick-post')
      .where('status', '==', 'inactive') // Use status instead of isVerified
      .get();

    // Sort in memory
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
    return jobs.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
  }

  /**
   * Approve quick post
   */
  async approveQuickPost(jobId: string): Promise<Job> {
    const jobRef = this.jobsCollection.doc(jobId);
    const doc = await jobRef.get();

    if (!doc.exists) {
      throw new Error('Job not found');
    }

    const job = doc.data() as Job;
    if (job.jobSource !== 'quick-post') {
      throw new Error('Not a quick post job');
    }

    await jobRef.update({
      isVerified: true,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ✅ Send notification email to poster
    if (job.contactInfo?.email) {
      await emailService.sendQuickPostApproved(
        job.contactInfo.email,
        job.title || 'Tin tìm việc'
      ).catch(err => console.error('Failed to send approval email:', err));
    }

    const updated = await jobRef.get();
    return { id: updated.id, ...updated.data() } as Job;
  }

  /**
   * Reject quick post
   */
  async rejectQuickPost(jobId: string, reason?: string): Promise<void> {
    const jobRef = this.jobsCollection.doc(jobId);
    const doc = await jobRef.get();

    if (!doc.exists) {
      throw new Error('Job not found');
    }

    const job = doc.data() as Job;
    
    // ✅ Send rejection notification email to poster BEFORE deleting
    if (job.contactInfo?.email) {
      await emailService.sendQuickPostRejected(
        job.contactInfo.email,
        job.title || 'Tin tìm việc',
        reason
      ).catch(err => console.error('Failed to send rejection email:', err));
    }

    // Delete the job
    await jobRef.delete();
    
    console.log(`Job ${jobId} rejected. Reason: ${reason || 'N/A'}`);
  }

  /**
   * Get all verified quick posts
   */
  async getVerifiedQuickPosts(limit: number = 50): Promise<Job[]> {
    const snapshot = await this.jobsCollection
      .where('jobSource', '==', 'quick-post')
      .where('isVerified', '==', true)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
  }

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
  ): Promise<boolean> {
    const jobRef = this.jobsCollection.doc(jobId);
    const doc = await jobRef.get();

    if (!doc.exists) {
      throw new Error('Job not found');
    }

    const job = doc.data() as Job;
    
    // Check if it's a quick-post job
    if (job.jobSource !== 'quick-post' && job.source !== 'quick-post') {
      throw new Error('Not a quick-post job');
    }

    // Get poster email
    const posterEmail = job.contactInfo?.email;
    if (!posterEmail) {
      console.warn('Quick-post job has no email. Cannot send notification.');
      return false;
    }

    // Send email notification
    return await emailService.notifyQuickPostApplication(
      posterEmail,
      job.title || 'Tin tuyển dụng',
      candidateData.name,
      candidateData.email,
      candidateData.phone,
      candidateData.cvUrl
    );
  }
}

export default new QuickPostService();
