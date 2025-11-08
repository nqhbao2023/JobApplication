export interface User {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: 'candidate' | 'employer' | 'admin';
  skills?: string[];
  savedJobIds?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Job {
  id?: string;
  title: string;
  company: string;
  companyId: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  category: string;
  status: 'active' | 'inactive' | 'closed';
  employerId: string;
  applicantCount?: number;
  viewCount?: number;
  createdAt: any;
  updatedAt: any;
  expiresAt?: any;
}

export interface Application {
  id?: string;
  jobId: string;
  candidateId: string;
  employerId: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  cvUrl?: string;
  coverLetter?: string;
  appliedAt: any;
  updatedAt: any;
}

export interface NewsArticle {
  id?: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  category: string;
  publishedAt: any;
  createdAt: any;
}

export interface AIRecommendation {
  jobId: string;
  score: number;
  reason: string;
  matchedSkills: string[];
}

