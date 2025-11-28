/**
 * CV Service
 * 
 * Handle CV operations:
 * - Save/Load CV from Firestore
 * - Auto-fill from Student Profile
 * - Export to PDF
 * - Upload CV file
 */

import { db, storage } from '@/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth } from '@/config/firebase';
import { CVData, EducationEntry, SkillCategory, SkillItem } from '@/types/cv.types';
import { StudentProfile } from '@/types';

class CVService {
  private readonly COLLECTION = 'cvs';

  /**
   * Create empty CV template for student
   */
  createEmptyCV(userId: string): CVData {
    const now = new Date().toISOString();
    
    return {
      userId,
      type: 'template', // ✅ NEW: Default type is template
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        address: '',
      },
      objective: 'Sinh viên năng động, mong muốn tìm kiếm cơ hội làm việc part-time để tích lũy kinh nghiệm thực tế.',
      education: [],
      skills: [],
      experience: [],
      projects: [],
      activities: [],
      certifications: [],
      languages: [],
      templateId: 'student-basic',
      createdAt: now,
      updatedAt: now,
      isDefault: false, // Will be set to true only for first CV
    };
  }

  /**
   * ✅ NEW: Create CV record from uploaded file
   */
  createUploadedCV(userId: string, fileUrl: string, fileName: string): CVData {
    const now = new Date().toISOString();
    
    // Extract name from filename if possible
    const nameFromFile = fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[_-]/g, ' ')    // Replace underscores/dashes with spaces
      .replace(/^\d+\s*/, '');  // Remove leading numbers
    
    return {
      userId,
      type: 'uploaded',
      pdfUrl: fileUrl,
      fileUrl: fileUrl,
      fileName: fileName,
      personalInfo: {
        fullName: nameFromFile || 'CV đã tải lên',
        email: auth.currentUser?.email || '',
        phone: '',
        address: '',
      },
      objective: '',
      education: [],
      skills: [],
      experience: [],
      projects: [],
      activities: [],
      certifications: [],
      languages: [],
      templateId: 'student-basic', // Required field, but not used for uploaded CVs
      createdAt: now,
      updatedAt: now,
      isDefault: false,
    };
  }

  /**
   * ✅ NEW: Upload CV file to Firebase Storage and create CV record
   */
  async uploadCVFile(
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<{ cvId: string; fileUrl: string }> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Prepare file for upload
      const blob = await (await fetch(fileUri)).blob();
      const safeName = `${userId}_${Date.now()}_${fileName}`;
      const fileRef = ref(storage, `cvs/${userId}/${safeName}`);

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(fileRef, blob, {
        contentType: mimeType,
      });

      // Track progress
      if (onProgress) {
        uploadTask.on('state_changed', (snap) => {
          const percent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress(percent);
        });
      }

      // Wait for upload to complete
      await uploadTask;
      const fileUrl = await getDownloadURL(fileRef);

      // Create CV record in Firestore
      const cvData = this.createUploadedCV(userId, fileUrl, fileName);
      const cvId = await this.saveCV(cvData);

      return { cvId, fileUrl };
    } catch (error) {
      console.error('Error uploading CV file:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Update CV with exported PDF URL
   */
  async updateCVPdfUrl(cvId: string, pdfUrl: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, cvId), {
        pdfUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating CV PDF URL:', error);
      throw error;
    }
  }

  /**
   * Auto-fill CV from Student Profile
   */
  autoFillFromProfile(emptyCV: CVData, userProfile: any, studentProfile?: StudentProfile): CVData {
    const cv: CVData = { ...emptyCV };

    // Personal Info
    cv.personalInfo = {
      fullName: userProfile.name || userProfile.displayName || '',
      email: userProfile.email || '',
      phone: userProfile.phone || '',
      address: studentProfile?.schoolLocation?.address || '',
      avatar: userProfile.photoURL || undefined,
    };

    // Skills from Student Profile
    if (studentProfile?.skills && studentProfile.skills.length > 0) {
      const technicalSkills: SkillItem[] = studentProfile.skills
        .filter(s => ['Microsoft Office', 'Photoshop', 'Video Editing'].includes(s))
        .map(s => ({ name: s, level: 'intermediate', levelText: 'Trung bình' }));

      const softSkills: SkillItem[] = studentProfile.skills
        .filter(s => ['Sales', 'Marketing', 'Customer Service'].includes(s))
        .map(s => ({ name: s, level: 'intermediate', levelText: 'Trung bình' }));

      const languageSkills: SkillItem[] = studentProfile.skills
        .filter(s => s.includes('Tiếng'))
        .map(s => ({ name: s, level: 'intermediate', levelText: 'Trung bình' }));

      const skillCategories: SkillCategory[] = [];

      if (technicalSkills.length > 0) {
        skillCategories.push({
          id: 'technical',
          category: 'technical',
          categoryName: 'Kỹ năng tin học',
          skills: technicalSkills,
        });
      }

      if (softSkills.length > 0) {
        skillCategories.push({
          id: 'soft',
          category: 'soft',
          categoryName: 'Kỹ năng mềm',
          skills: softSkills,
        });
      }

      if (languageSkills.length > 0) {
        skillCategories.push({
          id: 'language',
          category: 'language',
          categoryName: 'Ngoại ngữ',
          skills: languageSkills,
        });
      }

      cv.skills = skillCategories;
    }

    // Default Education Entry (nếu chưa có)
    if (cv.education.length === 0) {
      cv.education = [
        {
          id: 'edu-1',
          school: 'Đại học Thủ Dầu Một',
          degree: 'Cử nhân',
          major: 'Công nghệ thông tin',
          startDate: '2021-09',
          endDate: 'Hiện tại',
        },
      ];
    }

    // Languages
    if (cv.languages.length === 0) {
      cv.languages = [
        {
          id: 'lang-1',
          language: 'Tiếng Việt',
          proficiency: 'native',
          proficiencyText: 'Bản ngữ',
        },
        {
          id: 'lang-2',
          language: 'Tiếng Anh',
          proficiency: 'intermediate',
          proficiencyText: 'Trung bình',
        },
      ];
    }

    return cv;
  }

  /**
   * Save CV to Firestore
   */
  async saveCV(cvData: CVData): Promise<string> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const cvId = cvData.id || doc(collection(db, this.COLLECTION)).id;
      const isNewCV = !cvData.id;
      
      // If this is user's first CV, set it as default
      let isDefault = cvData.isDefault;
      if (isNewCV) {
        const userCVs = await this.getUserCVs();
        if (userCVs.length === 0) {
          isDefault = true;
        }
      }
      
      const cvDoc = {
        ...cvData,
        userId,
        id: cvId,
        isDefault,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, this.COLLECTION, cvId), cvDoc);
      
      return cvId;
    } catch (error) {
      console.error('Error saving CV:', error);
      throw error;
    }
  }

  /**
   * Load CV by ID
   */
  async loadCV(cvId: string): Promise<CVData | null> {
    try {
      const cvDoc = await getDoc(doc(db, this.COLLECTION, cvId));
      
      if (!cvDoc.exists()) {
        return null;
      }

      return cvDoc.data() as CVData;
    } catch (error) {
      console.error('Error loading CV:', error);
      throw error;
    }
  }

  /**
   * Get all CVs for current user
   */
  async getUserCVs(): Promise<CVData[]> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      
      // Sort by updatedAt in client to avoid composite index
      const cvs = snapshot.docs.map(doc => doc.data() as CVData);
      return cvs.sort((a, b) => {
        const timeA = new Date(a.updatedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || 0).getTime();
        return timeB - timeA; // desc order
      });
    } catch (error) {
      console.error('Error getting user CVs:', error);
      throw error;
    }
  }

  /**
   * Get default CV for user
   */
  async getDefaultCV(): Promise<CVData | null> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return null;

      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('isDefault', '==', true)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as CVData;
    } catch (error) {
      console.error('Error getting default CV:', error);
      throw error;
    }
  }

  /**
   * Set CV as default
   */
  async setDefaultCV(cvId: string): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Unset all default CVs
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('isDefault', '==', true)
      );

      const snapshot = await getDocs(q);
      const batch = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { isDefault: false })
      );
      await Promise.all(batch);

      // Set new default
      await updateDoc(doc(db, this.COLLECTION, cvId), {
        isDefault: true,
      });
    } catch (error) {
      console.error('Error setting default CV:', error);
      throw error;
    }
  }

  /**
   * Delete CV
   */
  async deleteCV(cvId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, cvId));
    } catch (error) {
      console.error('Error deleting CV:', error);
      throw error;
    }
  }

  /**
   * Duplicate CV
   */
  async duplicateCV(cvId: string): Promise<string> {
    try {
      const originalCV = await this.loadCV(cvId);
      if (!originalCV) throw new Error('CV not found');

      const newCV: CVData = {
        ...originalCV,
        id: undefined,
        personalInfo: { ...originalCV.personalInfo },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
      };

      return await this.saveCV(newCV);
    } catch (error) {
      console.error('Error duplicating CV:', error);
      throw error;
    }
  }
}

export const cvService = new CVService();
