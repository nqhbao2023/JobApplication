/**
 * Viecoi.vn Job Crawler using Puppeteer
 * Bypasses Cloudflare protection by using real browser
 * 
 * Usage:
 *   npx ts-node src/crawlers/viecoi/puppeteer-crawler.ts --limit 20
 */

import puppeteer, { Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface RawJobData {
  source_url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  salary_text: string;
  job_type_text: string;
  description_html: string;
  requirements_html: string;
  benefits_html: string;
  deadline?: string;
  crawled_at: string;
  source: 'viecoi.vn';
}

// Output directories
const DATA_DIR = path.join(__dirname, '../../..', 'data', 'viecoi');
const RAW_FILE = path.join(DATA_DIR, 'raw-jobs.json');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 50;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
    }
  }
  
  return { limit };
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`📁 Created directory: ${DATA_DIR}`);
  }
}

// Random delay to appear more human-like
function randomDelay(min = 2000, max = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Extract job URLs from sitemap using Puppeteer
async function fetchJobURLsFromSitemap(page: Page): Promise<string[]> {
  console.log('\n🌐 Fetching sitemap.xml...');
  
  try {
    // First, visit homepage to get cookies
    await page.goto('https://viecoi.vn', { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(3000, 5000);
    
    // Navigate to sitemap
    await page.goto('https://viecoi.vn/sitemap.xml', { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(2000, 3000);
    
    const content = await page.content();
    const $ = cheerio.load(content, { xmlMode: true });
    
    // Find job.xml sitemap URL
    let jobSitemapUrl = '';
    $('sitemap loc, loc').each((_, el) => {
      const url = $(el).text().trim();
      if (url.includes('job.xml')) {
        jobSitemapUrl = url;
      }
    });
    
    if (!jobSitemapUrl) {
      console.log('⚠️  job.xml not found in sitemap, trying direct URL...');
      jobSitemapUrl = 'https://viecoi.vn/job.xml';
    }
    
    console.log(`📄 Job sitemap URL: ${jobSitemapUrl}`);
    
    // Fetch job.xml
    await page.goto(jobSitemapUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(2000, 3000);
    
    const jobContent = await page.content();
    const $jobs = cheerio.load(jobContent, { xmlMode: true });
    
    const urls: string[] = [];
    $jobs('url loc, loc').each((_, el) => {
      const url = $jobs(el).text().trim();
      if (url.includes('/viec-lam/') || url.includes('/job/')) {
        urls.push(url);
      }
    });
    
    console.log(`✅ Found ${urls.length} job URLs from sitemap`);
    return urls;
    
  } catch (error: any) {
    console.error('❌ Error fetching sitemap:', error.message);
    return [];
  }
}

// Alternative: Extract job URLs from job listing pages
async function fetchJobURLsFromListing(page: Page, limit: number): Promise<string[]> {
  console.log('\n🌐 Fetching job URLs from listing pages...');
  
  const urls = new Set<string>();
  let pageNum = 1;
  const maxPages = Math.ceil(limit / 30) + 2; // Extra buffer pages
  
  try {
    while (urls.size < limit && pageNum <= maxPages) {
      // Use correct URL pattern for viecoi.vn
      const listUrl = pageNum === 1 
        ? 'https://viecoi.vn/tim-viec/all.html' 
        : `https://viecoi.vn/tim-viec/all.html?page=${pageNum}`;
      
      console.log(`📄 Page ${pageNum}: ${listUrl}`);
      
      await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await randomDelay(3000, 5000);
      
      // Extract job links with pattern /viec-lam/
      const pageLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.includes('/viec-lam/') && href.endsWith('.html'));
      });
      
      const prevSize = urls.size;
      pageLinks.forEach(link => urls.add(link));
      const foundOnPage = urls.size - prevSize;
      
      console.log(`   Found ${foundOnPage} new jobs on page ${pageNum} (total: ${urls.size})`);
      
      if (foundOnPage === 0) {
        console.log('   No new jobs found, stopping pagination');
        break;
      }
      
      pageNum++;
    }
    
    return Array.from(urls).slice(0, limit);
    
  } catch (error: any) {
    console.error('❌ Error fetching listing:', error.message);
    return Array.from(urls);
  }
}

// Extract job detail from a single page using JSON-LD structured data
async function extractJobDetail(page: Page, url: string): Promise<RawJobData | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(1500, 3000);
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Check if blocked
    if (content.includes('Just a moment') || content.includes('Enable JavaScript')) {
      console.log('⚠️  Cloudflare challenge detected, waiting...');
      await randomDelay(5000, 8000);
      const retryContent = await page.content();
      if (retryContent.includes('Just a moment')) {
        return null;
      }
    }
    
    // Extract JSON-LD structured data (most reliable source)
    let jsonLdData: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json['@type'] === 'JobPosting') {
          jsonLdData = json;
        }
      } catch (e) {}
    });
    
    // Extract from JSON-LD if available
    if (jsonLdData) {
      const title = jsonLdData.title?.replace(' - Việc làm mới', '').trim() || '';
      const companyName = jsonLdData.hiringOrganization?.name || '';
      const companyLogo = jsonLdData.hiringOrganization?.logo || '';
      const description = jsonLdData.description || '';
      const benefits = jsonLdData.jobBenefits || '';
      
      // Parse salary
      let salaryText = 'Thỏa thuận';
      if (jsonLdData.baseSalary?.value) {
        const minVal = jsonLdData.baseSalary.value.minValue;
        const maxVal = jsonLdData.baseSalary.value.maxValue;
        if (minVal && maxVal) {
          salaryText = `${(minVal / 1000000).toFixed(0)} - ${(maxVal / 1000000).toFixed(0)} triệu`;
        } else if (minVal) {
          salaryText = `Từ ${(minVal / 1000000).toFixed(0)} triệu`;
        }
      }
      
      // Parse location
      let location = '';
      if (jsonLdData.jobLocation?.address) {
        const addr = jsonLdData.jobLocation.address;
        location = [addr.streetAddress, addr.addressLocality, addr.addressRegion]
          .filter(Boolean)
          .join(', ');
      }
      
      // Parse job type
      let jobTypeText = 'Toàn thời gian';
      if (jsonLdData.employmentType) {
        const typeMap: Record<string, string> = {
          'FULL_TIME': 'Toàn thời gian',
          'PART_TIME': 'Bán thời gian',
          'CONTRACTOR': 'Hợp đồng',
          'TEMPORARY': 'Thời vụ',
          'INTERN': 'Thực tập'
        };
        jobTypeText = typeMap[jsonLdData.employmentType] || jsonLdData.employmentType;
      }
      
      // Parse deadline
      const deadline = jsonLdData.validThrough 
        ? new Date(jsonLdData.validThrough).toLocaleDateString('vi-VN')
        : '';
      
      // Skip if missing essential data
      if (!title || !companyName) {
        console.log(`⚠️  Skipping - missing title or company in JSON-LD: ${url}`);
        return null;
      }
      
      return {
        source_url: url,
        title,
        company_name: companyName,
        company_logo: companyLogo,
        location,
        salary_text: salaryText,
        job_type_text: jobTypeText,
        description_html: description,
        requirements_html: '', // Included in description
        benefits_html: benefits,
        deadline,
        crawled_at: new Date().toISOString(),
        source: 'viecoi.vn'
      };
    }
    
    // Fallback: Extract from DOM using class selectors
    console.log(`   ℹ️  No JSON-LD found, using DOM selectors for ${url}`);
    
    // Title - from h1 element
    const title = $('h1.info-jobs-title-title, h1').first().text().trim();
    
    // Company name - from company info area
    const companyName = $('h2.info-jobs-company a, a[href*="/gioi-thieu-cong-ty/"]').first().text().trim()
      || $('[class*="company-name"]').first().text().trim();
    
    // Company logo
    const companyLogo = $('.info-jobs-company img, [class*="company-logo"] img').first().attr('src') || '';
    
    // Salary - from salary text class
    const salaryText = $('.jobs-salary-text').first().text().trim() || 'Thỏa thuận';
    
    // Location - from job insights section
    const location = $('.jobs-insights-details .details-info').filter((_, el) => {
      return $(el).closest('.list-item').find('.title-info').text().includes('Vị trí') ||
             $(el).closest('.list-item').find('i[title*="địa"]').length > 0;
    }).first().text().trim()
      || $('.details-info').filter((_, el) => $(el).text().includes('Việt Nam')).first().text().trim();
    
    // Job type
    const jobTypeText = 'Toàn thời gian';
    
    // Description - from description details section
    const descriptionHtml = $('.jobs-description-details #des_company').html() || '';
    
    // Benefits - from benefits details section  
    const benefitsHtml = $('.jobs-benefits-details .spacing_tag').html() || '';
    
    // Deadline - from insights section
    const deadline = $('.jobs-insights-details .details-info').filter((_, el) => {
      return $(el).closest('.list-item').find('.title-info').text().includes('Hạn');
    }).first().text().trim();
    
    // Skip if missing essential data
    if (!title || !companyName) {
      console.log(`⚠️  Skipping - missing title or company: ${url}`);
      return null;
    }
    
    return {
      source_url: url,
      title,
      company_name: companyName,
      company_logo: companyLogo,
      location,
      salary_text: salaryText,
      job_type_text: jobTypeText,
      description_html: descriptionHtml,
      requirements_html: '', // Included in description
      benefits_html: benefitsHtml,
      deadline,
      crawled_at: new Date().toISOString(),
      source: 'viecoi.vn'
    };
    
  } catch (error: any) {
    console.error(`❌ Error extracting ${url}: ${error.message}`);
    return null;
  }
}

// Main crawler function
async function crawlJobs() {
  const { limit } = parseArgs();
  
  console.log('🚀 Starting Puppeteer-based crawler for viecoi.vn');
  console.log(`📊 Target: ${limit} jobs\n`);
  
  ensureDataDir();
  
  // Launch browser with stealth settings
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up page to avoid detection
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': 'https://www.google.com/'
    });
    
    // Hide automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });
    
    // Try sitemap first, fallback to listing pages
    let jobUrls = await fetchJobURLsFromSitemap(page);
    
    if (jobUrls.length === 0) {
      console.log('\n⚠️  Sitemap approach failed, trying listing pages...');
      jobUrls = await fetchJobURLsFromListing(page, limit);
    }
    
    if (jobUrls.length === 0) {
      console.log('❌ Could not fetch any job URLs. Exiting.');
      return;
    }
    
    // Limit URLs
    const targetUrls = jobUrls.slice(0, limit);
    console.log(`\n📝 Will crawl ${targetUrls.length} jobs\n`);
    
    // Crawl each job
    const jobs: RawJobData[] = [];
    for (let i = 0; i < targetUrls.length; i++) {
      const url = targetUrls[i];
      console.log(`[${i + 1}/${targetUrls.length}] Crawling: ${url}`);
      
      const job = await extractJobDetail(page, url);
      if (job) {
        jobs.push(job);
        console.log(`   ✅ ${job.title} - ${job.company_name}`);
      }
      
      // Random delay between requests
      if (i < targetUrls.length - 1) {
        await randomDelay(2000, 4000);
      }
    }
    
    // Save results
    fs.writeFileSync(RAW_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
    console.log(`\n✅ Saved ${jobs.length} jobs to ${RAW_FILE}`);
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - URLs found: ${jobUrls.length}`);
    console.log(`   - Jobs crawled: ${jobs.length}`);
    console.log(`   - Success rate: ${((jobs.length / targetUrls.length) * 100).toFixed(1)}%`);
    
  } catch (error: any) {
    console.error('❌ Crawler error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🔒 Browser closed');
  }
}

// Run
crawlJobs().catch(console.error);
