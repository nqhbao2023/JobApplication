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
        const status = existingApp.status;
        
        // ✅ Cho phép ứng tuyển lại nếu đã bị từ chối hoặc đã rút hồ sơ
        if (status === 'rejected' || status === 'withdrawn') {
          // Xóa application cũ và tạo mới
          await db.collection(APPLICATIONS_COLLECTION).doc(existingQuery.docs[0].id).delete();
          // Continue to create new application below
        } else if (hasSubmittedCV) {
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
        status: 'draft', // ✅ Start as draft, becomes 'pending' after CV upload
        appliedAt: now,
        updatedAt: now,
      };

      await appRef.set(newApplication);

      // ✅ NOTE: applicantCount và notifications sẽ được gửi khi CV được upload (trong updateApplication)
      // Không gửi notification/tăng count khi tạo draft

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

      // ✅ Filter out draft applications (employer should only see submitted applications)
      const submittedApplications = applications.filter(app => app.status !== 'draft');

      // Sort by appliedAt descending
      submittedApplications.sort((a, b) => {
        const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        return bDate - aDate;
      });

      // ✅ Enrich applications with candidate data
      const enrichedApplications = await Promise.all(
        submittedApplications.map(async (app) => {
          if (app.candidateId) {
            try {
              const candidateDoc = await db.collection('users').doc(app.candidateId).get();
              if (candidateDoc.exists) {
                const candidateData = candidateDoc.data();
                return {
                  ...app,
                  candidate: {
                    uid: candidateDoc.id,
                    displayName: candidateData?.displayName || candidateData?.fullName || candidateData?.name || null,
                    email: candidateData?.email || null,
                    photoURL: candidateData?.photoURL || candidateData?.avatar || null,
                    phone: candidateData?.phone || candidateData?.phoneNumber || null,
                  },
                };
              }
            } catch (err) {
              console.warn(`⚠️ Could not fetch candidate ${app.candidateId}:`, err);
            }
          }
          return app;
        })
      );

      return enrichedApplications;
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

      // ✅ Filter out draft applications (only show submitted applications)
      const submittedApplications = applications.filter(app => app.status !== 'draft');

      // Sort by appliedAt descending
      submittedApplications.sort((a, b) => {
        const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        return bDate - aDate;
      });

      return submittedApplications;
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

      // ✅ Check if this is the first CV submission (draft -> pending)
      const isFirstSubmission = data.status === 'draft' && updates.cvUrl !== undefined;

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

      // ✅ Send notifications only when CV is first submitted (draft -> pending)
      if (isFirstSubmission) {
        try {
          // Update applicant count
          const jobRef = db.collection('jobs').doc(data.jobId);
          const jobDoc = await jobRef.get();
          const currentApplicantCount = jobDoc.data()?.applicantCount || 0;
          await jobRef.update({
            applicantCount: currentApplicantCount + 1,
          });

          // Send email notification to employer
          const jobData = jobDoc.data();
          const candidateDoc = await db.collection('users').doc(candidateId).get();
          const employerDoc = await db.collection('users').doc(data.employerId).get();
          
          const candidateData = candidateDoc.data();
          const employerData = employerDoc.data();
          
          if (employerData?.email && jobData?.title) {
            await emailService.sendJobApplicationNotification(
              employerData.email,
              jobData.title,
              candidateData?.fullName || candidateData?.displayName || candidateData?.email || 'Ứng viên',
              candidateData?.email || '',
              candidateData?.phoneNumber || candidateData?.phone,
              updates.cvUrl
            );
            console.log(`📧 Email notification sent to employer: ${employerData.email}`);
          }

          // Create in-app notification for employer
          const candidateName = candidateData?.fullName || candidateData?.displayName || candidateData?.email || 'Ứng viên';
          const notificationRef = db.collection('notifications').doc();
          await notificationRef.set({
            userId: data.employerId,
            title: '👤 Ứng viên mới ứng tuyển!',
            message: `${candidateName} vừa ứng tuyển vào vị trí "${jobData?.title || 'Công việc'}". Nhấn để xem hồ sơ.`,
            type: 'application',
            jobId: data.jobId,
            applicationId: applicationId,
            candidateId: candidateId,
            read: false,
            created_at: new Date(),
          });
          console.log(`📬 In-app notification created for employer: ${data.employerId}`);
        } catch (notificationError) {
          console.error('⚠️ Failed to send notifications (non-critical):', notificationError);
          // Don't throw error - application was updated successfully
        }
      }

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
      const docSnap = await appRef.get();

      if (!docSnap.exists) {
        throw new AppError('Application not found', 404);
      }

      const applicationData = docSnap.data() as Application;

      await appRef.update({
        status,
        updatedAt: new Date(),
      });

      // ✅ Tạo notification cho candidate khi employer thay đổi trạng thái
      if (status === 'accepted' || status === 'rejected') {
        try {
          // Lấy thông tin job để hiển thị trong notification
          const jobDoc = await db.collection('jobs').doc(applicationData.jobId).get();
          const jobTitle = jobDoc.exists ? jobDoc.data()?.title || 'Công việc' : 'Công việc';

          const notificationTitle = status === 'accepted' 
            ? 'Congratulation! Hồ sơ được chấp nhận!' 
            : '📋 Cập nhật hồ sơ ứng tuyển';
          
          const notificationMessage = status === 'accepted'
            ? `Chúc mừng! Hồ sơ ứng tuyển vị trí "${jobTitle}" của bạn đã được nhà tuyển dụng chấp nhận. Hãy kiểm tra tin nhắn để biết thêm chi tiết.`
            : `Hồ sơ ứng tuyển vị trí "${jobTitle}" của bạn đã bị từ chối. Đừng nản lòng, hãy tiếp tục tìm kiếm cơ hội phù hợp khác!`;

          // Tạo notification trong Firestore
          const notificationRef = db.collection('notifications').doc();
          await notificationRef.set({
            userId: applicationData.candidateId,
            title: notificationTitle,
            message: notificationMessage,
            type: 'application',
            jobId: applicationData.jobId,
            applicationId: applicationId,
            status: status,
            read: false,
            created_at: new Date(),
          });

          console.log(`📬 Notification created for candidate ${applicationData.candidateId} - Status: ${status}`);
        } catch (notifError) {
          // Không throw error - notification là non-critical
          console.error('⚠️ Failed to create notification (non-critical):', notifError);
        }
      }

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

