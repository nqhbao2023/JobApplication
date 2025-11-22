import { db } from '../config/firebase';
import { Application } from '../types';
import { AppError } from '../middleware/errorHandler';
import emailService from './email.service';

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
        const existingApp = existingQuery.docs[0].data() as Application;
        const hasSubmittedCV = !!existingApp.cvUrl;
        
        if (hasSubmittedCV) {
          throw new AppError('Bạn đã nộp CV cho công việc này rồi. Vui lòng kiểm tra tại mục "Đơn ứng tuyển".', 400);
        } else {
          // Có draft nhưng chưa submit CV - trả về draft để user có thể tiếp tục
          return existingApp;
        }
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

      // ✅ Send email notification to employer
      try {
        const jobData = jobDoc.data();
        const candidateDoc = await db.collection('users').doc(applicationData.candidateId).get();
        const employerDoc = await db.collection('users').doc(applicationData.employerId).get();
        
        const candidateData = candidateDoc.data();
        const employerData = employerDoc.data();
        
        if (employerData?.email && jobData?.title) {
          await emailService.sendJobApplicationNotification(
            employerData.email,
            jobData.title,
            candidateData?.fullName || candidateData?.email || 'Ứng viên',
            candidateData?.email || '',
            candidateData?.phoneNumber,
            applicationData.cvUrl
          );
          console.log(`📧 Email notification sent to employer: ${employerData.email}`);
        }
      } catch (emailError) {
        console.error('⚠️  Failed to send email notification (non-critical):', emailError);
        // Don't throw error - application was created successfully
      }

      return newApplication;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create application: ${error.message}`, 500);
    }
  }

  async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
    try {
      // ✅ Query without orderBy first (avoid index requirement)
      const snapshot = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('candidateId', '==', candidateId)
        .get();

      // ✅ Sort in memory by appliedAt
      const applications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];

      // Sort by appliedAt descending
      applications.sort((a, b) => {
        const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        return bDate - aDate;
      });

      return applications;
    } catch (error: any) {
      console.error('Error fetching candidate applications:', error);
      throw new AppError(`Failed to fetch applications: ${error.message}`, 500);
    }
  }

  async getApplicationsByEmployer(employerId: string): Promise<Application[]> {
    try {
      // ✅ Query without orderBy first (avoid index requirement)
      const snapshot = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('employerId', '==', employerId)
        .get();

      // ✅ Sort in memory by appliedAt
      const applications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];

      // Sort by appliedAt descending
      applications.sort((a, b) => {
        const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        return bDate - aDate;
      });

      return applications;
    } catch (error: any) {
      console.error('Error fetching employer applications:', error);
      throw new AppError(`Failed to fetch applications: ${error.message}`, 500);
    }
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    try {
      // ✅ Query without orderBy first (avoid index requirement)
      const snapshot = await db
        .collection(APPLICATIONS_COLLECTION)
        .where('jobId', '==', jobId)
        .get();

      // ✅ Sort in memory by appliedAt
      const applications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];

      // Sort by appliedAt descending
      applications.sort((a, b) => {
        const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        return bDate - aDate;
      });

      return applications;
    } catch (error: any) {
      console.error('Error fetching job applications:', error);
      throw new AppError(`Failed to fetch applications: ${error.message}`, 500);
    }
  }
  async updateApplication(
    applicationId: string,
    candidateId: string,
    updates: Partial<Pick<Application, 'cvUrl' | 'coverLetter'>>
  ): Promise<Application> {
    try {
      const appRef = db.collection(APPLICATIONS_COLLECTION).doc(applicationId);
      const doc = await appRef.get();

      if (!doc.exists) {
        throw new AppError('Application not found', 404);
      }

      const data = doc.data() as Application;
      if (data.candidateId !== candidateId) {
        throw new AppError('Unauthorized to update this application', 403);
      }

      const updatePayload: Partial<Application> = {
        updatedAt: new Date(),
      };

      if (updates.cvUrl !== undefined) {
        updatePayload.cvUrl = updates.cvUrl;
        updatePayload.status = 'pending';
      }

      if (updates.coverLetter !== undefined) {
        updatePayload.coverLetter = updates.coverLetter;
      }

      if (Object.keys(updatePayload).length === 1) {
        throw new AppError('No valid fields provided for update', 400);
      }

      await appRef.update(updatePayload);
      const updatedDoc = await appRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as Application;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update application: ${error.message}`, 500);
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

