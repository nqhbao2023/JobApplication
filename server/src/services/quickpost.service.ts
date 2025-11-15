import { db } from '../config/firebase';
import { Job } from '../types';
import { FieldValue } from 'firebase-admin/firestore';

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
      jobSource: 'quick-post',
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
    
    return { id: doc.id, ...doc.data() } as Job;
  }

  /**
   * Get all pending quick posts
   */
  async getPendingQuickPosts(): Promise<Job[]> {
    const snapshot = await this.jobsCollection
      .where('jobSource', '==', 'quick-post')
      .where('isVerified', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
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

    // Có thể lưu reason vào metadata hoặc xóa luôn
    await jobRef.delete();
    
    // TODO: Send notification to poster nếu có email
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
}

export default new QuickPostService();
