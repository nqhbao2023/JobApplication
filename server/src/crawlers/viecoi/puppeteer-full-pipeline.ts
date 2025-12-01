/**
 * Full Pipeline for Puppeteer Viecoi Crawler
 * Crawl → Normalize → AI Categorize → Upsert to Firebase → Sync to Algolia
 * 
 * Features:
 *   - Hybrid AI categorization (Regex 80% + Gemini AI 20%)
 *   - Full logging and stats tracking
 *   - Automatic scheduling support
 * 
 * Usage:
 *   npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts --limit 20
 *   npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts --skip-crawl
 */

import * as fs from 'fs';
import * as path from 'path';
import { hybridCategorize } from './ai-categorizer';

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../..', '.env') });

// Output directories
const DATA_DIR = path.join(__dirname, '../../..', 'data', 'viecoi');
const RAW_FILE = path.join(DATA_DIR, 'raw-jobs.json');
const NORMALIZED_FILE = path.join(DATA_DIR, 'normalized-jobs.json');
const PIPELINE_LOG_FILE = path.join(DATA_DIR, '..', 'logs', 'pipeline.log');

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

interface NormalizedJob {
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_text: string;
  job_type_id: string;
  jobCategories: string;
  categoryConfidence?: number;
  categoryMethod?: 'regex' | 'ai';
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  source: 'viecoi';
  external_url: string;
  status: 'pending' | 'active' | 'draft';
  is_verified: boolean;
  expires_at?: string;
  created_at: string;
}

// Pipeline logging
function ensureLogDir() {
  const logDir = path.dirname(PIPELINE_LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function logPipeline(message: string) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(PIPELINE_LOG_FILE, logLine);
  console.log(message);
}

/**
 * Map job type từ viecoi → Job4S job_type_id
 */
function normalizeJobType(rawType: string): string {
  const type = rawType.toLowerCase().trim();
  
  if (type.includes('full') || type.includes('toàn')) return 'full-time';
  if (type.includes('part') || type.includes('bán')) return 'part-time';
  if (type.includes('intern') || type.includes('thực tập')) return 'internship';
  if (type.includes('contract') || type.includes('hợp đồng')) return 'contract';
  if (type.includes('remote')) return 'remote';
  
  return 'full-time';
}

/**
 * Parse salary text → min/max
 */
function parseSalary(salaryText: string): { min?: number; max?: number; text: string } {
  const text = salaryText.toLowerCase().trim();
  
  if (text.includes('thỏa') || text.includes('negotiate') || text.includes('deal')) {
    return { text: 'Thỏa thuận' };
  }

  const cleanText = text.replace(/,/g, '');
  
  // "8 - 30 triệu" pattern
  const trieuMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*tri/);
  if (trieuMatch) {
    return {
      min: parseFloat(trieuMatch[1]) * 1_000_000,
      max: parseFloat(trieuMatch[2]) * 1_000_000,
      text: salaryText
    };
  }

  // VND range pattern "20,000,000 - 25,000,000 VND"
  const vndMatch = cleanText.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (vndMatch) {
    let min = parseFloat(vndMatch[1]);
    let max = parseFloat(vndMatch[2]);
    
    // Already in VND (>100,000)
    if (min >= 100_000) {
      return { min, max, text: salaryText };
    }
    
    // Likely in millions
    return {
      min: min * 1_000_000,
      max: max * 1_000_000,
      text: salaryText
    };
  }

  return { text: salaryText };
}

/**
 * Strip HTML and extract text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract list items from HTML
 */
function extractListItems(html: string): string[] {
  const liMatches = html.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
  return liMatches
    .map(li => stripHtml(li))
    .filter(text => text.length > 5);
}

/**
 * Normalize a single raw job (basic normalization without category)
 */
function normalizeJobBasic(raw: RawJobData): Omit<NormalizedJob, 'jobCategories' | 'categoryConfidence' | 'categoryMethod'> {
  const salary = parseSalary(raw.salary_text);
  const description = stripHtml(raw.description_html);
  
  return {
    title: raw.title,
    company_name: raw.company_name,
    company_logo: raw.company_logo,
    location: raw.location,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_text: salary.text,
    job_type_id: normalizeJobType(raw.job_type_text),
    description: description,
    requirements: extractListItems(raw.description_html).filter(item => 
      item.toLowerCase().includes('yêu cầu') || 
      item.toLowerCase().includes('kinh nghiệm') ||
      item.toLowerCase().includes('kỹ năng')
    ),
    benefits: [
      ...extractListItems(raw.benefits_html),
      ...extractListItems(raw.description_html).filter(item =>
        item.toLowerCase().includes('quyền lợi') ||
        item.toLowerCase().includes('phúc lợi') ||
        item.toLowerCase().includes('thưởng')
      )
    ],
    skills: [],
    source: 'viecoi',
    external_url: raw.source_url,
    status: 'active',
    is_verified: true, // From trusted source
    expires_at: raw.deadline || undefined,
    created_at: raw.crawled_at
  };
}

// Parse CLI arguments
function parseArgs(): { limit: number; skipCrawl: boolean } {
  const args = process.argv.slice(2);
  let limit = 50;
  let skipCrawl = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--skip-crawl') {
      skipCrawl = true;
    }
  }
  
  return { limit, skipCrawl };
}

async function runPipeline() {
  const startTime = Date.now();
  const { limit, skipCrawl } = parseArgs();
  
  logPipeline('═'.repeat(60));
  logPipeline('🚀 Starting Full Pipeline with Hybrid AI Categorization');
  logPipeline(`   Options: limit=${limit}, skipCrawl=${skipCrawl}`);
  logPipeline('═'.repeat(60));
  
  // Step 0: Run crawler if not skipped
  if (!skipCrawl) {
    logPipeline('\n📥 Step 0: Running Puppeteer Crawler...');
    try {
      const { spawn } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        const crawler = spawn('npx', ['ts-node', path.join(__dirname, 'puppeteer-crawler.ts'), '--limit', limit.toString()], {
          cwd: path.join(__dirname, '../../..'),
          shell: true,
          stdio: 'inherit'
        });
        crawler.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Crawler exited with code ${code}`));
        });
      });
      logPipeline('   ✅ Crawler completed');
    } catch (error: any) {
      logPipeline(`   ❌ Crawler failed: ${error.message}`);
      logPipeline('   Attempting to continue with existing data...');
    }
  }
  
  // Step 1: Check raw data
  logPipeline('\n📂 Step 1: Loading raw data...');
  if (!fs.existsSync(RAW_FILE)) {
    logPipeline(`❌ Raw file not found: ${RAW_FILE}`);
    logPipeline('   Please run: npx ts-node src/crawlers/viecoi/puppeteer-crawler.ts --limit 20');
    process.exit(1);
  }
  
  const rawJobs: RawJobData[] = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
  logPipeline(`   ✅ Loaded ${rawJobs.length} raw jobs`);
  
  // Step 2: Basic Normalization
  logPipeline('\n🔧 Step 2: Basic normalization...');
  const basicNormalized = rawJobs.map(normalizeJobBasic);
  
  // Deduplicate
  const seen = new Set<string>();
  const uniqueJobs = basicNormalized.filter(job => {
    const key = `${job.title}|${job.company_name}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  logPipeline(`   ✅ Normalized ${basicNormalized.length} → ${uniqueJobs.length} unique jobs`);
  
  // Step 3: Hybrid AI Categorization
  logPipeline('\n🤖 Step 3: Hybrid AI Categorization...');
  const jobsForCategorization = uniqueJobs.map(job => ({
    ...job,
    title: job.title,
    description: job.description
  }));
  
  const { results: categorizedResults, stats: categorizationStats } = await hybridCategorize(jobsForCategorization);
  
  // Merge categorization results back
  const finalJobs: NormalizedJob[] = uniqueJobs.map((job, idx) => ({
    ...job,
    jobCategories: categorizedResults[idx]?.jobCategories || 'other',
    categoryConfidence: categorizedResults[idx]?.categoryConfidence,
    categoryMethod: categorizedResults[idx]?.categoryMethod
  }));
  
  // Save normalized data with categories
  fs.writeFileSync(NORMALIZED_FILE, JSON.stringify(finalJobs, null, 2), 'utf-8');
  logPipeline(`   💾 Saved to ${NORMALIZED_FILE}`);
  
  // Print categorization stats
  logPipeline('\n📊 Categorization Statistics:');
  logPipeline(`   Total jobs: ${categorizationStats.total}`);
  logPipeline(`   Regex handled: ${categorizationStats.regexHandled} (${Math.round(categorizationStats.regexHandled / categorizationStats.total * 100)}%)`);
  logPipeline(`   AI handled: ${categorizationStats.aiHandled} (${Math.round(categorizationStats.aiHandled / categorizationStats.total * 100)}%)`);
  logPipeline(`   Avg regex confidence: ${categorizationStats.avgRegexConfidence}%`);
  logPipeline(`   Avg AI confidence: ${categorizationStats.avgAiConfidence}%`);
  
  // Job stats
  const jobTypes: Record<string, number> = {};
  let withSalary = 0;
  
  finalJobs.forEach(job => {
    jobTypes[job.job_type_id] = (jobTypes[job.job_type_id] || 0) + 1;
    if (job.salary_min) withSalary++;
  });
  
  logPipeline('\n   Job Types:');
  Object.entries(jobTypes).forEach(([type, count]) => {
    logPipeline(`     - ${type}: ${count}`);
  });
  
  logPipeline('\n   Categories (from AI categorization):');
  Object.entries(categorizationStats.categoryDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      logPipeline(`     - ${cat}: ${count}`);
    });
  
  logPipeline(`\n   Salary info: ${withSalary}/${finalJobs.length} jobs`);
  
  // Step 4: Upsert to Firebase
  logPipeline('\n🔥 Step 4: Upserting to Firebase...');
  try {
    const { main: upsertMain } = await import('./upsert-jobs');
    await upsertMain();
  } catch (error: any) {
    logPipeline(`   ❌ Firebase upsert failed: ${error.message}`);
    logPipeline('   Skipping Firebase upsert, continuing with pipeline...');
  }
  
  // Step 5: Sync to Algolia
  logPipeline('\n🔍 Step 5: Syncing to Algolia...');
  try {
    const { fetchViecoiJobs, syncToAlgolia } = await import('./sync-algolia');
    const firebaseJobs = await fetchViecoiJobs();
    await syncToAlgolia(firebaseJobs);
  } catch (error: any) {
    logPipeline(`   ❌ Algolia sync failed: ${error.message}`);
    logPipeline('   Skipping Algolia sync...');
  }
  
  const totalTime = Date.now() - startTime;
  
  logPipeline('\n' + '═'.repeat(60));
  logPipeline('✨ Pipeline completed!');
  logPipeline(`   Total time: ${Math.round(totalTime / 1000)}s`);
  logPipeline('📄 Files:');
  logPipeline(`   - Raw: ${RAW_FILE}`);
  logPipeline(`   - Normalized: ${NORMALIZED_FILE}`);
  logPipeline(`   - Logs: ${PIPELINE_LOG_FILE}`);
  logPipeline('═'.repeat(60));
  
  // Return stats for external use
  return {
    totalJobs: finalJobs.length,
    categorizationStats,
    totalTimeMs: totalTime
  };
}

// Export for external use
export { runPipeline };

// Run
runPipeline().catch(err => {
  console.error('❌ Pipeline error:', err);
  process.exit(1);
});
