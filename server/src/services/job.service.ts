// server/src/services/job.service.ts (FIXED)
import { db } from '../config/firebase';
import { Job } from '../types';
import { AppError } from '../middleware/errorHandler';

const JOBS_COLLECTION = 'jobs';

/**
 * Helper function: Convert Firestore date to ISO string
 */
function toISOString(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

/**
 * Helper function: Map Firestore doc to Job type
 */
function mapDocToJob(doc: FirebaseFirestore.DocumentSnapshot): Job {
  const data = doc.data();
  if (!data) {
    throw new AppError('Document data is empty', 500);
  }

  return {
    id: doc.id,
    $id: doc.id,
    title: data.title || '',
    company: data.company || '',
    companyId: data.companyId || data.company || '',
    description: data.description || '',
    requirements: data.requirements || [],
    skills: data.skills || [],
    salary: data.salary || { min: 0, max: 0, currency: 'VND' },
    location: data.location || '',
    type: data.type || 'full-time',
    category: data.category || '',
    status: data.status || 'active',
    image: data.image || data.img || data.imageUrl || undefined, // ✅ Add image field
    // ✅ Priority: employerId > ownerId > users.id (legacy field)
    employerId: data.employerId || data.ownerId || data.users?.id || '',
    ownerId: data.ownerId || data.employerId || data.users?.id,
    applicantCount: data.applicantCount || 0,
    viewCount: data.viewCount || 0,
    created_at: toISOString(data.created_at || data.createdAt),
    updated_at: toISOString(data.updated_at || data.updatedAt),
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    expiresAt: data.expiresAt,
    // ✅ NEW PLAN: External job fields
    source: data.source,
    external_url: data.external_url,
    is_verified: data.is_verified,
    contactInfo: data.contactInfo,
    workSchedule: data.workSchedule,
    hourlyRate: data.hourlyRate,
  } as Job;
}

export class JobService {
  async getAllJobs(filters?: {
    status?: string;
    category?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Job[]; total: number }> {
    try {
      let query = db.collection(JOBS_COLLECTION);

      if (filters?.status) {
        query = query.where('status', '==', filters.status) as any;
      }
      if (filters?.category) {
        query = query.where('category', '==', filters.category) as any;
      }
      if (filters?.type) {
        query = query.where('type', '==', filters.type) as any;
      }

      // Optimize: Apply limit at Firestore level if no filters
      // Note: Firestore requires index for orderBy with where, so we fetch then sort
      const requestLimit = filters?.limit ? filters.limit + (filters.offset || 0) : undefined;
      if (requestLimit && !filters?.status && !filters?.category && !filters?.type) {
        query = query.limit(requestLimit) as any;
      }

      const snapshot = await query.get();
      
      // Map documents to Job type
      const jobs = snapshot.docs.map(mapDocToJob);

      // Sort by created_at descending
      jobs.sort((a, b) => {
        const aTime = Date.parse(a.created_at || '0') || 0;
        const bTime = Date.parse(b.created_at || '0') || 0;
        return bTime - aTime;
      });

      // Pagination
      const start = filters?.offset || 0;
      const limit = filters?.limit || jobs.length;
      const paginatedJobs = jobs.slice(start, start + limit);

      return { jobs: paginatedJobs, total: jobs.length };
    } catch (error: any) {
      console.error('❌ JobService.getAllJobs error:', error);
      throw new AppError(`Failed to fetch jobs: ${error.message}`, 500);
    }
  }

  async getJobById(jobId: string): Promise<Job> {
    try {
      const doc = await db.collection(JOBS_COLLECTION).doc(jobId).get();

      if (!doc.exists) {
        throw new AppError('Job not found', 404);
      }

      const job = mapDocToJob(doc);
      
      // ✅ If employerId is missing, try to get it from company
      if (!job.employerId && job.companyId) {
        try {
          const companyDoc = await db.collection('companies').doc(job.companyId).get();
          if (companyDoc.exists) {
            const companyData = companyDoc.data();
            // Try to get ownerId from company
            if (companyData?.ownerId) {
              job.employerId = companyData.ownerId;
            }
          }
        } catch (companyError) {
          // If company doesn't exist or error, just log and continue
          console.warn('⚠️ Could not fetch company for employerId:', companyError);
        }
      }

      return job;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('❌ JobService.getJobById error:', error);
      throw new AppError(`Failed to fetch job: ${error.message}`, 500);
    }
  }

  async createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    try {
      const now = new Date();
      const jobRef = db.collection(JOBS_COLLECTION).doc();

      // ✅ Normalize employerId/ownerId: đồng bộ employerId và ownerId
      const normalizedEmployerId = jobData.employerId || (jobData as any).ownerId;
      if (!normalizedEmployerId) {
        throw new AppError('Missing employerId for job creation', 400);
      }

      const newJob: any = {
        ...jobData,
        employerId: normalizedEmployerId,
        ownerId: (jobData as any).ownerId || normalizedEmployerId,
        id: jobRef.id,
        status: jobData.status || 'active',
        applicantCount: 0,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      await jobRef.set(newJob);
      
      // Fetch created job
      const doc = await jobRef.get();
      return mapDocToJob(doc);
    } catch (error: any) {
      console.error('❌ JobService.createJob error:', error);
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

      const now = new Date();
      const updatedData: any = {
        ...updates,
        updatedAt: now,
        updated_at: now.toISOString(),
      };

      // ✅ Normalize employerId/ownerId: đồng bộ employerId và ownerId nếu có cập nhật
      const normalizedEmployerId = updates.employerId || (updates as any).ownerId;
      if (normalizedEmployerId) {
        updatedData.employerId = normalizedEmployerId;
        updatedData.ownerId = (updates as any).ownerId || normalizedEmployerId;
      }

      await jobRef.update(updatedData);
      
      // Fetch updated job
      const updated = await jobRef.get();
      return mapDocToJob(updated);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('❌ JobService.updateJob error:', error);
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
      console.error('❌ JobService.deleteJob error:', error);
      throw new AppError(`Failed to delete job: ${error.message}`, 500);
    }
  }

  async incrementViewCount(jobId: string): Promise<void> {
    try {
      const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
      const jobDoc = await jobRef.get();
      
      if (!jobDoc.exists) {
        console.warn(`⚠️ Job ${jobId} not found for view increment`);
        return;
      }

      const data = jobDoc.data();
      const currentViewCount = data?.viewCount || 0;
      
      await jobRef.update({
        viewCount: currentViewCount + 1,
        updatedAt: new Date(),
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`⚠️ Failed to increment view count: ${error.message}`);
      // Non-critical, don't throw
    }
  }

  async getJobsByEmployer(employerId: string): Promise<Job[]> {
    try {
      const snapshot = await db
        .collection(JOBS_COLLECTION)
        .where('employerId', '==', employerId)
        .get();

      const jobs = snapshot.docs.map(mapDocToJob);
      
      // Sort by created_at descending
      jobs.sort((a, b) => {
        const aTime = Date.parse(a.created_at || '0') || 0;
        const bTime = Date.parse(b.created_at || '0') || 0;
        return bTime - aTime;
      });

      return jobs;
    } catch (error: any) {
      console.error('❌ JobService.getJobsByEmployer error:', error);
      throw new AppError(`Failed to fetch employer jobs: ${error.message}`, 500);
    }
  }
}

export default new JobService();
