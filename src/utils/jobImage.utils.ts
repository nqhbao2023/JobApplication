/**
 * Utility functions for job image handling
 */

/**
 * Get the best image URL for a job
 * Priority: company_logo (viecoi) > image > company.image > placeholder
 */
export const getJobImageUrl = (job: any): string => {
  // 1. Try company_logo (for viecoi jobs)
  if (job?.company_logo) return job.company_logo;
  
  // 2. Try job image
  if (job?.image) return job.image;
  
  // 3. Try company image
  const company = job?.company;
  if (company && typeof company === 'object' && (company as any).image) {
    return (company as any).image;
  }
  
  // 4. Fallback to placeholder with company name
  const companyName = job?.company_name || 
    (company && typeof company === 'object' ? company.corp_name : '') || 
    'Job';
  
  return `https://via.placeholder.com/80x80.png?text=${encodeURIComponent(companyName)}`;
};

/**
 * Get company name from job
 * Supports both company object and company_name string (viecoi jobs)
 */
export const getJobCompanyName = (job: any): string => {
  // Try company_name (viecoi jobs)
  if (job?.company_name) return job.company_name;
  
  // Try company object
  const company = job?.company;
  if (!company) return 'Không rõ công ty';
  
  if (typeof company === 'string') return company;
  if (typeof company === 'object' && company.corp_name) return company.corp_name;
  
  return 'Không rõ công ty';
};
