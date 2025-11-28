/**
 * CV Types for Student CV Builder
 * 
 * Designed for students with minimal experience
 * Focus on skills, education, and potential
 */

export interface CVData {
  id?: string;
  userId?: string;
  
  // ✅ NEW: CV Type - distinguishes template-created vs uploaded CVs
  type?: 'template' | 'uploaded';
  
  // ✅ NEW: PDF URL - stores the PDF file URL for BOTH types
  // For template CVs: URL of exported PDF
  // For uploaded CVs: URL of uploaded file
  pdfUrl?: string;
  
  // ✅ NEW: Original file URL (for uploaded CVs)
  fileUrl?: string;
  
  // ✅ NEW: Original file name (for uploaded CVs)
  fileName?: string;
  
  // Personal Information
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
    avatar?: string;
  };
  
  // Objective/Summary
  objective?: string; // Career objective for students
  
  // Education (Trường học)
  education: EducationEntry[];
  
  // Skills (Kỹ năng)
  skills: SkillCategory[];
  
  // Experience (Kinh nghiệm - optional for students)
  experience: ExperienceEntry[];
  
  // Projects (Dự án - important for students)
  projects: ProjectEntry[];
  
  // Activities (Hoạt động ngoại khóa)
  activities: ActivityEntry[];
  
  // Certifications (Chứng chỉ)
  certifications: CertificationEntry[];
  
  // Languages (Ngoại ngữ)
  languages: LanguageEntry[];
  
  // References (Người giới thiệu - optional)
  references?: ReferenceEntry[];
  
  // Metadata
  templateId: 'student-basic' | 'student-modern' | 'student-creative';
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean; // CV mặc định khi apply
}

export interface EducationEntry {
  id: string;
  school: string; // e.g., "Đại học Thủ Dầu Một"
  degree: string; // e.g., "Cử nhân Công nghệ thông tin"
  major?: string; // e.g., "Khoa học máy tính"
  startDate: string; // "2021-09"
  endDate?: string; // "2025-06" hoặc "Hiện tại"
  gpa?: number; // 3.5/4.0
  achievements?: string[]; // ["Học bổng xuất sắc", "GPA 3.8"]
}

export interface SkillCategory {
  id: string;
  category: 'technical' | 'soft' | 'language' | 'other';
  categoryName: string; // "Kỹ năng tin học", "Kỹ năng mềm"
  skills: SkillItem[];
}

export interface SkillItem {
  name: string; // "Microsoft Office", "JavaScript"
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  levelText?: string; // "Cơ bản", "Trung bình", "Khá", "Giỏi"
}

export interface ExperienceEntry {
  id: string;
  position: string; // "Nhân viên part-time"
  company: string; // "Highlands Coffee"
  location?: string; // "Bình Dương"
  startDate: string; // "2023-06"
  endDate?: string; // "2023-12" hoặc "Hiện tại"
  description?: string; // Mô tả công việc
  achievements?: string[]; // ["Phục vụ 50+ khách/ngày"]
}

export interface ProjectEntry {
  id: string;
  name: string; // "Website quản lý thư viện"
  role: string; // "Team Leader", "Developer"
  description: string; // Mô tả dự án
  technologies?: string[]; // ["React", "Node.js", "MongoDB"]
  startDate?: string;
  endDate?: string;
  link?: string; // GitHub, demo link
}

export interface ActivityEntry {
  id: string;
  name: string; // "Tình nguyện mùa hè xanh"
  organization?: string; // "Đoàn trường"
  role?: string; // "Trưởng nhóm"
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CertificationEntry {
  id: string;
  name: string; // "IELTS 6.5"
  issuer: string; // "IDP"
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LanguageEntry {
  id: string;
  language: string; // "Tiếng Anh"
  proficiency: 'elementary' | 'intermediate' | 'advanced' | 'native';
  proficiencyText?: string; // "Cơ bản", "Trung bình", "Khá", "Bản ngữ"
  certification?: string; // "IELTS 6.5"
}

export interface ReferenceEntry {
  id: string;
  name: string;
  position: string;
  company: string;
  phone: string;
  email?: string;
}

// CV Template Configuration
export interface CVTemplate {
  id: 'student-basic' | 'student-modern' | 'student-creative';
  name: string;
  description: string;
  thumbnail?: string;
  color: {
    primary: string;
    secondary: string;
    text: string;
  };
  font: {
    heading: string;
    body: string;
  };
}

// CV Export Options
export interface CVExportOptions {
  format: 'pdf' | 'docx' | 'image';
  quality?: 'low' | 'medium' | 'high';
  fileName?: string;
}

// Predefined Templates
export const CV_TEMPLATES: CVTemplate[] = [
  {
    id: 'student-basic',
    name: 'Cơ bản - Sinh viên',
    description: 'Template đơn giản, dễ đọc, phù hợp mọi ngành',
    color: {
      primary: '#2563eb',
      secondary: '#64748b',
      text: '#1e293b',
    },
    font: {
      heading: 'Arial',
      body: 'Times New Roman',
    },
  },
  {
    id: 'student-modern',
    name: 'Hiện đại - IT/Design',
    description: 'Template sáng tạo, nổi bật cho ngành công nghệ',
    color: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      text: '#1e293b',
    },
    font: {
      heading: 'Montserrat',
      body: 'Open Sans',
    },
  },
  {
    id: 'student-creative',
    name: 'Sáng tạo - Marketing',
    description: 'Template màu sắc, phù hợp ngành sáng tạo',
    color: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      text: '#1e293b',
    },
    font: {
      heading: 'Poppins',
      body: 'Lato',
    },
  },
];
