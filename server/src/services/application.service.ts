import { db } from '../config/firebase';
import { Application, ApplicationWithJob } from '../types';
import { AppError } from '../middleware/errorHandler';
import jobService from './job.service';

const APPLICATIONS_COLLECTION = 'applications';

export class ApplicationService {
  async createApplication(
    applicationData: Omit<Application, 'id' | 'appliedAt' | 'updatedAt'>
  ): Promise<Application> {
    try {
      const existingQuery = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('jobId', '==', applicationData.jobId)
        .where('candidateId', '==', applicationData.candidateId)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        throw new AppError('You have already applied to this job', 400);
      }

      const now = new Date();
      const appRef = db.collection(APPLICATIONS_COLLECTION).doc();

      const newApplication: Application = {
        ...applicationData,
        id: appRef.id,
        status: 'pending',
        appliedAt: now,
        updatedAt: now,
      };

      await appRef.set(newApplication);

      const jobRef = db.collection('jobs').doc(applicationData.jobId);
      const jobDoc = await jobRef.get();
      const currentApplicantCount = jobDoc.data()?.applicantCount || 0;
      await jobRef.update({
        applicantCount: currentApplicantCount + 1,
      });

      return newApplication;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create application: ${error.message}`, 500);
    }
  }

  private async enrichApplications(applications: Application[]): Promise<ApplicationWithJob[]> {
    if (!applications.length) return [];

    const jobEntries = await Promise.all(
      applications.map(async (application) => {
        try {
          const job = await jobService.getJobById(application.jobId);
          return [application.jobId, job] as const;
        } catch (error) {
          console.warn('⚠️ Missing job for application:', application.jobId, error);
          return null;
        }
      })
    );

    const jobMap = new Map<string, any>();
    for (const entry of jobEntries) {
      if (entry) {
        jobMap.set(entry[0], entry[1]);
      }
    }

    return applications.map((application) => ({
      ...application,
      job: jobMap.get(application.jobId),
    }));
  }

  async getApplicationsByCandidate(candidateId: string): Promise<ApplicationWithJob[]> {
    try {
      const snapshot = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('candidateId', '==', candidateId)
        .orderBy('appliedAt', 'desc')
        .get();

      const applications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];

      return this.enrichApplications(applications);
    } catch (error: any) {
      throw new AppError(`Failed to fetch applications: ${error.message}`, 500);
    }
  }

  async getApplicationsByEmployer(employerId: string): Promise<ApplicationWithJob[]> {
    try {
      const snapshot = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('employerId', '==', employerId)
        .orderBy('appliedAt', 'desc')
        .get();

      const applications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];

      return this.enrichApplications(applications);
    } catch (error: any) {
      throw new AppError(`Failed to fetch applications: ${error.message}`, 500);
    }
  }

  async getApplicationsByJob(jobId: string): Promise<ApplicationWithJob[]> {
    try {
      const snapshot = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('jobId', '==', jobId)
        .orderBy('appliedAt', 'desc')
        .get();

      const applications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];

      return this.enrichApplications(applications);
    } catch (error: any) {
      throw new AppError(`Failed to fetch applications: ${error.message}`, 500);
    }
  }

  async updateApplicationStatus(
    applicationId: string,
    status: Application['status']
  ): Promise<Application> {
    try {
      const appRef = db.collection(APPLICATIONS_COLLECTION).doc(applicationId);
      const doc = await appRef.get();

      if (!doc.exists) {
        throw new AppError('Application not found', 404);
      }

      await appRef.update({
        status,
        updatedAt: new Date(),
      });

      const updated = await appRef.get();
      return { id: updated.id, ...updated.data() } as Application;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update application: ${error.message}`, 500);
    }
  }

  async withdrawApplication(applicationId: string, candidateId: string): Promise<void> {
    try {
      const appRef = db.collection(APPLICATIONS_COLLECTION).doc(applicationId);
      const doc = await appRef.get();

      if (!doc.exists) {
        throw new AppError('Application not found', 404);
      }

      const appData = doc.data();
      if (appData?.candidateId !== candidateId) {
        throw new AppError('Unauthorized to withdraw this application', 403);
      }

      await appRef.update({
        status: 'withdrawn',
        updatedAt: new Date(),
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to withdraw application: ${error.message}`, 500);
    }
  }
}

export default new ApplicationService();

