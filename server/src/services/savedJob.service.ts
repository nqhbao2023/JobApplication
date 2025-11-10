import admin, { db } from '../config/firebase';
import jobService from './job.service';
import { AppError } from '../middleware/errorHandler';
import { Job } from '../types';

interface SavedJobRecord {
  id: string;
  userId: string;
  jobId: string;
  created_at?: admin.firestore.Timestamp | string | Date;
}

export interface SavedJobWithDetails extends SavedJobRecord {
  savedAt: string;
  job?: Job;
}

const SAVED_JOBS_COLLECTION = 'saved_jobs';

const toISOString = (value?: admin.firestore.Timestamp | string | Date): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return value.toDate().toISOString();
};

class SavedJobService {
  async getSavedJobs(userId: string): Promise<SavedJobWithDetails[]> {
    const snapshot = await db
      .collection(SAVED_JOBS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('created_at', 'desc')
      .get();

    const records: SavedJobRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId,
      jobId: doc.data().jobId,
      created_at: doc.data().created_at,
    }));

    const jobEntries = await Promise.all(
      records.map(async (record) => {
        try {
          const job = await jobService.getJobById(record.jobId);
          return [record.jobId, job] as const;
        } catch (error) {
          console.warn('⚠️ Missing job for saved entry:', record.jobId, error);
          return null;
        }
      })
    );

    const jobMap = new Map<string, Job>();
    for (const entry of jobEntries) {
      if (entry) {
        jobMap.set(entry[0], entry[1]);
      }
    }

    return records.map((record) => ({
      ...record,
      savedAt: toISOString(record.created_at),
      job: jobMap.get(record.jobId),
    }));
  }

  async saveJob(userId: string, jobId: string): Promise<SavedJobWithDetails> {
    const job = await jobService.getJobById(jobId);

    const existing = await db
      .collection(SAVED_JOBS_COLLECTION)
      .where('userId', '==', userId)
      .where('jobId', '==', jobId)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return {
        id: doc.id,
        userId,
        jobId,
        created_at: doc.data().created_at,
        savedAt: toISOString(doc.data().created_at),
        job,
      };
    }

    const docRef = await db.collection(SAVED_JOBS_COLLECTION).add({
      userId,
      jobId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const savedDoc = await docRef.get();

    return {
      id: docRef.id,
      userId,
      jobId,
      created_at: savedDoc.data()?.created_at,
      savedAt: toISOString(savedDoc.data()?.created_at),
      job,
    };
  }

  async removeJob(userId: string, jobId: string): Promise<void> {
    const snapshot = await db
      .collection(SAVED_JOBS_COLLECTION)
      .where('userId', '==', userId)
      .where('jobId', '==', jobId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new AppError('Saved job not found', 404);
    }

    await db.collection(SAVED_JOBS_COLLECTION).doc(snapshot.docs[0].id).delete();
  }
}

export default new SavedJobService();
