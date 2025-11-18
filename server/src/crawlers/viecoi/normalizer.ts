/**
 * Data Normalizer for Viecoi.vn
 * Normalize crawled data từ viecoi.vn về Job4S schema
 */

import { JobData } from './job-crawler';

interface NormalizedJob {
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_text: string;
  job_type_id: string;
  category: string;
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
  if (type.includes('intern') || type.includes('thực tập')) return 'intern';
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
 * Normalize category
 */
function normalizeCategory(rawCategory: string): string {
  const category = rawCategory.toLowerCase().trim();
  
  // Map common categories
  if (category.includes('it') || category.includes('công nghệ')) return 'IT/Software';
  if (category.includes('marketing')) return 'Marketing/PR';
  if (category.includes('sale') || category.includes('bán hàng')) return 'Sales';
  if (category.includes('design') || category.includes('thiết kế')) return 'Design';
  if (category.includes('kế toán') || category.includes('account')) return 'Accounting';
  if (category.includes('nhân sự') || category.includes('hr')) return 'HR';
  if (category.includes('kinh doanh')) return 'Business';
  if (category.includes('dịch vụ')) return 'Service';
  
  return rawCategory || 'Other';
}

/**
 * Main normalize function
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
    category: normalizeCategory(job.category),
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
 * Normalize multiple jobs
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
