import { db } from '../config/firebase';
import { Job } from '../types';
import { AppError } from '../middleware/errorHandler';

const JOBS_COLLECTION = 'jobs';

export class JobService {
  async getAllJobs(filters?: {
    status?: string;
    category?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Job[]; total: number }> {
    try {
      let query = db.collection(JOBS_COLLECTION).orderBy('createdAt', 'desc');

      if (filters?.status) {
        query = query.where('status', '==', filters.status) as any;
      }
      if (filters?.category) {
        query = query.where('category', '==', filters.category) as any;
      }
      if (filters?.type) {
        query = query.where('type', '==', filters.type) as any;
      }

      const snapshot = await query.get();
      const jobs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];

      const start = filters?.offset || 0;
      const limit = filters?.limit || jobs.length;
      const paginatedJobs = jobs.slice(start, start + limit);

      return { jobs: paginatedJobs, total: jobs.length };
    } catch (error: any) {
      throw new AppError(`Failed to fetch jobs: ${error.message}`, 500);
    }
  }

  async getJobById(jobId: string): Promise<Job> {
    try {
      const doc = await db.collection(JOBS_COLLECTION).doc(jobId).get();

      if (!doc.exists) {
        throw new AppError('Job not found', 404);
      }

      return { id: doc.id, ...doc.data() } as Job;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to fetch job: ${error.message}`, 500);
    }
  }

  async createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    try {
      const now = new Date();
      const jobRef = db.collection(JOBS_COLLECTION).doc();

      const newJob: Job = {
        ...jobData,
        id: jobRef.id,
        status: jobData.status || 'active',
        applicantCount: 0,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await jobRef.set(newJob);
      return newJob;
    } catch (error: any) {
      throw new AppError(`Failed to create job: ${error.message}`, 500);
    }
  }

  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job> {
    try {
      const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
      const doc = await jobRef.get();

      if (!doc.exists) {
        throw new AppError('Job not found', 404);
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };

      await jobRef.update(updatedData);
      const updated = await jobRef.get();

      return { id: updated.id, ...updated.data() } as Job;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update job: ${error.message}`, 500);
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    try {
      const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
      const doc = await jobRef.get();

      if (!doc.exists) {
        throw new AppError('Job not found', 404);
      }

      await jobRef.delete();
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete job: ${error.message}`, 500);
    }
  }

  async incrementViewCount(jobId: string): Promise<void> {
    try {
      const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
      await jobRef.update({
        viewCount: (await jobRef.get()).data()?.viewCount || 0 + 1,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      console.error(`Failed to increment view count: ${error.message}`);
    }
  }

  async getJobsByEmployer(employerId: string): Promise<Job[]> {
    try {
      const snapshot = await db
        .collection(JOBS_COLLECTION)
        .where('employerId', '==', employerId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];
    } catch (error: any) {
      throw new AppError(`Failed to fetch employer jobs: ${error.message}`, 500);
    }
  }
}

export default new JobService();

