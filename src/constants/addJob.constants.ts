export const DRAFT_KEY = '@job_draft_v1';

export const AI_TEMPLATES = {
  it: {
    title: 'Senior Full-stack Developer',
    jobDescription: 'Phát triển và duy trì các ứng dụng web/mobile, làm việc với team đa chức năng',
    responsibilities: 'Thiết kế kiến trúc hệ thống, code review, mentor junior developers',
    skillsRequired: 'React, Node.js, TypeScript, Firebase, Git',
    experience: '3+ năm',
  },
  marketing: {
    title: 'Digital Marketing Specialist',
    jobDescription: 'Xây dựng và thực hiện chiến lược marketing online',
    responsibilities: 'Quản lý campaigns, phân tích dữ liệu, tối ưu ROI',
    skillsRequired: 'SEO, Google Ads, Facebook Ads, Analytics',
    experience: '2+ năm',
  },
  sales: {
    title: 'Sales Executive',
    jobDescription: 'Tìm kiếm và phát triển khách hàng mới',
    responsibilities: 'Chăm sóc khách hàng, đạt chỉ tiêu doanh số',
    skillsRequired: 'Kỹ năng giao tiếp, đàm phán, CRM',
    experience: '1+ năm',
  },
};

export type JobFormData = {
  title: string;
  jobDescription: string;
  responsibilities: string;
  skillsRequired: string;
  salaryMin: string;
  salaryMax: string;
  workingType: string;
  experience: string;
  location: string; // ✨ NEW: Location field
  quantity: string;
  deadline: string;
  selectedJobType: string | null;
  selectedJobCategory: string | null;
  selectedCompany: string | null;
  customJobType: string;
  customJobCategory: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  imageUri: string | null;
  image: string;
  
};

export type NewCompanyData = {
  corp_name: string;
  nation: string;
  corp_description: string;
  city: string;
  image: string;
  color: string;
};

export type ExpandedSections = {
  basic: boolean;
  details: boolean;
  classification: boolean;
  media: boolean;
  preview: boolean;
};