/**
 * Data Normalizer for Viecoi.vn
 * Normalize crawled data từ viecoi.vn về Job4S schema
 */

import { JobData } from './job-crawler';
import aiService from '../../services/ai.service';

interface NormalizedJob {
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_text: string;
  job_type_id: string;
  jobCategories: string; // ✅ Changed: category ID instead of category string
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  source: 'viecoi';
  external_url: string;
  status: 'pending' | 'active' | 'draft';
  is_verified: boolean;
  expires_at?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
}

/**
 * Map job type từ viecoi → Job4S job_type_id
 */
function normalizeJobType(rawType: string): string {
  const type = rawType.toLowerCase().trim();
  
  if (type.includes('full') || type.includes('toàn')) return 'full-time';
  if (type.includes('part') || type.includes('bán')) return 'part-time';
  if (type.includes('intern') || type.includes('thực tập')) return 'internship'; // ✅ Fixed: internship instead of intern
  if (type.includes('contract') || type.includes('hợp đồng')) return 'contract';
  if (type.includes('remote')) return 'remote';
  
  return 'full-time'; // default
}

/**
 * Parse salary text → min/max
 */
function parseSalary(salaryText: string): {
  min?: number;
  max?: number;
  text: string;
} {
  const text = salaryText.toLowerCase().trim();
  
  // "Thỏa thuận" or "Negotiate"
  if (text.includes('thỏa') || text.includes('negotiate') || text.includes('deal')) {
    return { text: 'Thỏa thuận' };
  }

  // Remove commas from numbers for easier parsing
  const cleanText = text.replace(/,/g, '');
  
  // Extract numbers (e.g., "10-15 triệu", "1000-1500$", "10M-15M VND", "25000000-30000000 VND")
  const match = cleanText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  
  if (match) {
    const min = parseFloat(match[1]);
    const max = parseFloat(match[2]);
    
    // Determine currency and convert to VND
    let minVND = min;
    let maxVND = max;
    
    if (cleanText.includes('triệu') || cleanText.includes('tr')) {
      minVND = min * 1_000_000;
      maxVND = max * 1_000_000;
    } else if (cleanText.includes('$') || cleanText.includes('usd')) {
      minVND = min * 23_000; // rough conversion
      maxVND = max * 23_000;
    } else if (cleanText.includes('k') || cleanText.includes('nghìn')) {
      minVND = min * 1_000;
      maxVND = max * 1_000;
    }
    // If numbers are already large (> 100,000), assume they're already in VND
    else if (min < 100_000) {
      // Likely in millions (e.g., "10 - 15" → "10M - 15M")
      minVND = min * 1_000_000;
      maxVND = max * 1_000_000;
    }
    
    return { min: minVND, max: maxVND, text: salaryText };
  }

  // Single number (e.g., "15 triệu", "1000$")
  const singleMatch = cleanText.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    let valueVND = value;
    
    if (cleanText.includes('triệu') || cleanText.includes('tr')) {
      valueVND = value * 1_000_000;
    } else if (cleanText.includes('$') || cleanText.includes('usd')) {
      valueVND = value * 23_000;
    } else if (cleanText.includes('k') || cleanText.includes('nghìn')) {
      valueVND = value * 1_000;
    } else if (value < 100_000) {
      // Likely in millions
      valueVND = value * 1_000_000;
    }
    
    return { min: valueVND, text: salaryText };
  }

  return { text: salaryText };
}

/**
 * Normalize category → category ID (with AI fallback)
 */
async function normalizeCategoryWithAI(rawCategory: string, jobTitle: string, description: string): Promise<string> {
  const category = rawCategory.toLowerCase().trim();
  
  // Try rule-based first (faster)
  if (category.includes('it') || category.includes('công nghệ') || category.includes('phần mềm')) return 'it-software';
  if (category.includes('marketing') || category.includes('truyền thông')) return 'marketing';
  if (category.includes('sale') || category.includes('bán hàng') || category.includes('kinh doanh')) return 'sales';
  if (category.includes('design') || category.includes('thiết kế')) return 'design';
  if (category.includes('kế toán') || category.includes('account') || category.includes('tài chính')) return 'finance';
  if (category.includes('nhân sự') || category.includes('hr') || category.includes('hành chính')) return 'hr';
  if (category.includes('y tế') || category.includes('dược')) return 'healthcare';
  if (category.includes('giáo dục')) return 'education';
  if (category.includes('f&b') || category.includes('phục vụ') || category.includes('nhà hàng')) return 'fb';
  if (category.includes('retail') || category.includes('bán lẻ')) return 'retail';
  
  // If rule-based failed, use AI
  try {
    const aiCategory = await aiService.autoCategorizeJob(jobTitle, description);
    console.log(`🤖 AI categorized "${jobTitle}" → ${aiCategory}`);
    return aiCategory.toLowerCase().replace(/\s+/g, '-');
  } catch (error) {
    console.warn('⚠️ AI categorization failed, using fallback:', error);
    return 'other';
  }
}

/**
 * Legacy synchronous version for backward compatibility
 */
function normalizeCategory(rawCategory: string): string {
  const category = rawCategory.toLowerCase().trim();
  
  // Map to category IDs that exist in Firestore
  if (category.includes('it') || category.includes('công nghệ') || category.includes('phần mềm')) return 'it-software';
  if (category.includes('marketing') || category.includes('truyền thông')) return 'marketing';
  if (category.includes('sale') || category.includes('bán hàng') || category.includes('kinh doanh')) return 'sales';
  if (category.includes('design') || category.includes('thiết kế')) return 'design';
  if (category.includes('kế toán') || category.includes('account') || category.includes('tài chính')) return 'finance';
  if (category.includes('nhân sự') || category.includes('hr') || category.includes('hành chính')) return 'hr';
  if (category.includes('y tế') || category.includes('dược')) return 'healthcare';
  if (category.includes('giáo dục')) return 'education';
  
  return 'other';
}

/**
 * Main normalize function (async for AI support)
 */
export async function normalizeJobAsync(job: JobData): Promise<NormalizedJob> {
  const salary = parseSalary(job.salary);
  const category = await normalizeCategoryWithAI(job.category, job.title, job.description);
  
  return {
    title: job.title,
    company_name: job.company,
    company_logo: job.companyLogo,
    location: job.location,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_text: salary.text,
    job_type_id: normalizeJobType(job.jobType),
    jobCategories: category,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    skills: job.skills,
    source: 'viecoi',
    external_url: job.url,
    status: 'pending',
    is_verified: false,
    expires_at: job.expiresAt,
    contact_email: job.contactEmail,
    contact_phone: job.contactPhone,
    created_at: new Date().toISOString(),
  };
}

/**
 * Main normalize function (sync, uses rule-based only)
 */
export function normalizeJob(job: JobData): NormalizedJob {
  const salary = parseSalary(job.salary);
  
  return {
    title: job.title,
    company_name: job.company,
    company_logo: job.companyLogo,
    location: job.location,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_text: salary.text,
    job_type_id: normalizeJobType(job.jobType),
    jobCategories: normalizeCategory(job.category), // ✅ Changed: now returns category ID
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    skills: job.skills,
    source: 'viecoi',
    external_url: job.url,
    status: 'pending', // Admin cần duyệt trước khi publish
    is_verified: false,
    expires_at: job.expiresAt,
    contact_email: job.contactEmail,
    contact_phone: job.contactPhone,
    created_at: new Date().toISOString(),
  };
}

/**
 * Normalize multiple jobs (async)
 */
export async function normalizeJobsAsync(jobs: JobData[]): Promise<NormalizedJob[]> {
  const promises = jobs.map(job => normalizeJobAsync(job));
  return Promise.all(promises);
}

/**
 * Normalize multiple jobs (sync)
 */
export function normalizeJobs(jobs: JobData[]): NormalizedJob[] {
  return jobs.map(normalizeJob);
}

/**
 * Deduplicate jobs (by title + company + location)
 */
export function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  const unique: NormalizedJob[] = [];

  for (const job of jobs) {
    const key = `${job.title}|${job.company_name}|${job.location}`.toLowerCase();
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(job);
    }
  }

  console.log(`📊 Deduplicated: ${jobs.length} → ${unique.length} unique jobs`);
  return unique;
}
