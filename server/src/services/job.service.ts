// server/src/services/job.service.ts (FIXED)
import { db } from '../config/firebase';
import { Job } from '../types';
import { AppError } from '../middleware/errorHandler';
import aiService from './ai.service';
import { isAlgoliaEnabled, getAlgoliaClient, INDEX_NAMES } from '../config/algolia';

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
    jobSource: data.jobSource, // ✅ ADD: quick-post source
    jobType: data.jobType, // ✅ ADD: candidate_seeking or employer_seeking
    posterId: data.posterId, // ✅ ADD: UID of poster
    external_url: data.external_url,
    is_verified: data.is_verified,
    isVerified: data.isVerified,
    contactInfo: data.contactInfo,
    workSchedule: data.workSchedule,
    hourlyRate: data.hourlyRate,
    // ✅ Candidate seeking fields
    cvUrl: data.cvUrl,
    expectedSalary: data.expectedSalary,
    availableSchedule: data.availableSchedule,
    // ✅ Viecoi aggregator fields
    company_name: data.company_name,
    company_logo: data.company_logo,
    salary_text: data.salary_text,
  } as Job;
}

/**
 * ✅ Helper: Auto-sync job to Algolia after create/update
 * Runs in background, không block response
 */
async function syncJobToAlgolia(job: Job): Promise<void> {
  if (!isAlgoliaEnabled()) {
    console.log('⚠️ Algolia disabled, skipping sync for job:', job.id);
    return;
  }

  try {
    const client = getAlgoliaClient();
    const algoliaObject = {
      objectID: job.id,
      title: job.title || '',
      company: job.company || '',
      companyId: job.companyId || '',
      description: job.description || '',
      location: job.location || '',
      type: job.type || '',
      category: job.category || '',
      status: job.status || 'active',
      salary: job.salary || null,
      skills: job.skills || [],
      requirements: job.requirements || [],
      createdAt: job.createdAt instanceof Date ? job.createdAt.getTime() / 1000 : Date.now() / 1000,
      image: job.image || null,
      company_logo: job.company_logo || null,
      company_name: job.company_name || job.company || '',
      salary_text: job.salary_text || null,
      _tags: [job.type, job.category, job.status, job.location].filter(Boolean),
      companyName: job.company,
      jobType: job.type,
      jobCategory: job.category,
      jobLocation: job.location,
    };

    await client.saveObjects({
      indexName: INDEX_NAMES.JOBS,
      objects: [algoliaObject],
    });

    console.log(`✅ Synced job "${job.title}" (${job.id}) to Algolia`);
  } catch (error: any) {
    console.error('⚠️ Failed to sync job to Algolia:', error.message);
    // Don't throw - sync failure should not block job creation
  }
}

/**
 * ✅ Helper: Delete job from Algolia
 */
async function deleteJobFromAlgolia(jobId: string): Promise<void> {
  if (!isAlgoliaEnabled()) {
    return;
  }

  try {
    const client = getAlgoliaClient();
    await client.deleteObject({
      indexName: INDEX_NAMES.JOBS,
      objectID: jobId,
    });
    console.log(`✅ Deleted job ${jobId} from Algolia`);
  } catch (error: any) {
    console.error('⚠️ Failed to delete job from Algolia:', error.message);
  }
}

export class JobService {
  async getAllJobs(filters?: {
    status?: string;
    category?: string;
    type?: string;
    limit?: number;
    offset?: number;
    includeAllJobTypes?: boolean; // ✅ NEW: Set true to include candidate_seeking jobs
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
      let jobs = snapshot.docs.map(mapDocToJob);

      // ✅ NEW: Filter out candidate_seeking jobs by default (tin tìm việc của candidate)
      // These should only be visible to employers in "Tìm ứng viên" page
      if (!filters?.includeAllJobTypes) {
        jobs = jobs.filter(job => job.jobType !== 'candidate_seeking');
      }

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

  /**
   * Get job by ID safely - returns null instead of throwing error if not found
   * Useful for cases where job might have been deleted but still referenced
   */
  async getJobByIdSafe(jobId: string): Promise<Job | null> {
    try {
      const doc = await db.collection(JOBS_COLLECTION).doc(jobId).get();

      if (!doc.exists) {
        console.warn(`⚠️ Job ${jobId} not found (may have been deleted)`);
        return null;
      }

      return mapDocToJob(doc);
    } catch (error: any) {
      console.error('❌ JobService.getJobByIdSafe error:', error);
      return null;
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

      // ✅ AI AUTO-CATEGORIZE: Tự động phân loại nếu category rỗng hoặc là 'other'/'khác'
      let finalCategory = jobData.category;
      const needsAutoCategorize = !finalCategory || 
        finalCategory.trim() === '' || 
        finalCategory.toLowerCase() === 'other' || 
        finalCategory.toLowerCase() === 'khác';

      if (needsAutoCategorize && jobData.title && jobData.description) {
        try {
          console.log('🤖 [AI Auto-categorize] Starting for job:', jobData.title);
          const aiCategory = await aiService.autoCategorizeJob(jobData.title, jobData.description);
          finalCategory = aiCategory;
          console.log(`✅ [AI Auto-categorize] Result: "${jobData.title}" → ${aiCategory}`);
        } catch (aiError: any) {
          console.warn('⚠️ [AI Auto-categorize] Failed, using fallback:', aiError.message);
          finalCategory = finalCategory || 'Other';
        }
      }

      const newJob: any = {
        ...jobData,
        category: finalCategory, // ✅ Use AI-categorized or original category
        employerId: normalizedEmployerId,
        ownerId: (jobData as any).ownerId || normalizedEmployerId,
        id: jobRef.id,
        status: jobData.status || 'active',
        source: jobData.source || 'internal', // ✅ Default source for employer jobs
        jobType: jobData.jobType || 'employer_seeking', // ✅ NEW: Employer tìm candidate
        posterId: jobData.posterId || normalizedEmployerId, // ✅ NEW: Poster = employer
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
      const createdJob = mapDocToJob(doc);
      
      // ✅ Auto-sync to Algolia (background, non-blocking)
      syncJobToAlgolia(createdJob).catch(err => console.error('Algolia sync error:', err));
      
      return createdJob;
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
      const updatedJob = mapDocToJob(updated);
      
      // ✅ Auto-sync to Algolia (background, non-blocking)
      syncJobToAlgolia(updatedJob).catch(err => console.error('Algolia sync error:', err));
      
      return updatedJob;
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
      
      // ✅ Auto-delete from Algolia (background, non-blocking)
      deleteJobFromAlgolia(jobId).catch(err => console.error('Algolia delete error:', err));
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
