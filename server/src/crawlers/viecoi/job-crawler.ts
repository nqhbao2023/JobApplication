/**
 * Job Crawler for Viecoi.vn
 * Crawl chi tiết jobs từ /viec-lam/*.html
 * 
 * Run: ts-node server/src/crawlers/viecoi/job-crawler.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../../../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'viecoi-jobs-raw.json');

export interface JobData {
  url: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary: string;
  jobType: string;
  category: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  expiresAt?: string;
  contactEmail?: string;
  contactPhone?: string;
  postedDate?: string;
}

/**
 * Crawl single job page
 */
export async function crawlJobPage(url: string): Promise<JobData | null> {
  console.log(`🔍 Crawling: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Job4S-Crawler/1.0 (Educational Purpose)',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Extract job data using correct viecoi.vn selectors
    const title = $('h1.title_container, h1').first().text().trim();
    const company = $('h2.name-cpn-title, .name-cpn-title').first().text().trim();
    
    // Extract company logo
    const companyLogoSrc = $('img.logo-company').first().attr('src');
    let companyLogo: string | undefined;
    if (companyLogoSrc && !companyLogoSrc.includes('loadingImg')) {
      // Make sure the URL is absolute
      if (companyLogoSrc.startsWith('http')) {
        companyLogo = companyLogoSrc;
      } else if (companyLogoSrc.startsWith('/')) {
        companyLogo = 'https://cdn.viecoi.vn' + companyLogoSrc;
      } else {
        companyLogo = 'https://cdn.viecoi.vn/' + companyLogoSrc;
      }
    }
    
    const location = $('[class*="location"]').first().text().trim().split('\n').filter(s => s.trim())[0] || '';
    const salary = $('[class*="salary"]').first().text().trim().split('\n')[0].trim();
    
    // Description (full HTML or plain text)
    const descriptionHtml = $('[class*="description"]').html() || '';
    const description = descriptionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Requirements
    const requirements: string[] = [];
    $('.requirements li, .job-requirements li').each((_, el) => {
      const req = $(el).text().trim();
      if (req) requirements.push(req);
    });

    // Benefits
    const benefits: string[] = [];
    $('.benefits li, .job-benefits li').each((_, el) => {
      const benefit = $(el).text().trim();
      if (benefit) benefits.push(benefit);
    });

    // Skills (tags)
    const skills: string[] = [];
    $('.skills .tag, .job-tags .tag, .skill-tag').each((_, el) => {
      const skill = $(el).text().trim();
      if (skill) skills.push(skill);
    });

    // Job type
    const jobType = $('.job-type, .employment-type').first().text().trim() || 'Full-time';

    // Category
    const category = $('.category, .job-category').first().text().trim() || 'Other';

    // Expires date
    const expiresAt = $('.deadline, .expire-date').first().text().trim();

    // Contact
    const contactEmail = $('.contact-email, .email').first().text().trim();
    const contactPhone = $('.contact-phone, .phone').first().text().trim();

    // Posted date
    const postedDate = $('.posted-date, .publish-date').first().text().trim();

    // Validate essential fields
    if (!title || !company) {
      console.warn(`⚠️  Skipping (missing title or company): ${url}`);
      return null;
    }

    const jobData: JobData = {
      url,
      title,
      company,
      companyLogo,
      location: location || 'Việt Nam',
      salary: salary || 'Thỏa thuận',
      jobType,
      category,
      description,
      requirements,
      benefits,
      skills,
      expiresAt,
      contactEmail,
      contactPhone,
      postedDate,
    };

    console.log(`  ✅ ${title} at ${company}`);
    return jobData;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`  ❌ Failed to crawl ${url}: ${error.message}`);
    } else {
      console.error(`  ❌ Error parsing ${url}:`, error);
    }
    return null;
  }
}

/**
 * Crawl multiple job pages
 */
export async function crawlMultipleJobs(
  urls: string[],
  options?: { delay?: number; maxRetries?: number }
): Promise<JobData[]> {
  const { delay = 1000, maxRetries = 3 } = options || {};
  const jobs: JobData[] = [];

  console.log(`🚀 Crawling ${urls.length} job pages...\n`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}]`);

    let retries = 0;
    let jobData: JobData | null = null;

    while (retries < maxRetries && !jobData) {
      jobData = await crawlJobPage(url);
      
      if (!jobData && retries < maxRetries - 1) {
        console.log(`  ⚠️  Retry ${retries + 1}/${maxRetries - 1}...`);
        await sleep(delay * 2);
        retries++;
      } else {
        break;
      }
    }

    if (jobData) {
      jobs.push(jobData);
    }

    // Delay between requests (be polite!)
    if (i < urls.length - 1) {
      await sleep(delay);
    }
  }

  console.log(`\n✅ Successfully crawled ${jobs.length}/${urls.length} jobs`);
  return jobs;
}

/**
 * Save jobs to file
 */
export function saveJobs(jobs: JobData[]): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  console.log(`💾 Saved ${jobs.length} jobs to ${OUTPUT_FILE}`);
}

/**
 * Helper: sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * CLI runner
 */
if (require.main === module) {
  (async () => {
    try {
      // Import updated URL fetcher
      const { fetchJobURLs } = await import('./fetch-job-urls');
      
      // Get job URLs (mặc định crawl 50 job nếu không truyền --limit)
      const limit = process.argv.includes('--limit') 
        ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) 
        : 50;
      
      const jobURLs = await fetchJobURLs(limit);
      
      if (jobURLs.length === 0) {
        console.log('⚠️  No job URLs found');
        process.exit(0);
      }

      // Crawl jobs
      const urls = jobURLs.map(j => j.url);
      const jobs = await crawlMultipleJobs(urls, { delay: 1000 });

      // Save to file
      saveJobs(jobs);

      console.log('\n✅ Job crawl completed!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Crawl failed:', error);
      process.exit(1);
    }
  })();
}
