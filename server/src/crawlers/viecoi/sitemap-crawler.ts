/**
 * Sitemap Crawler for Viecoi.vn
 * Crawl sitemap.xml để lấy danh sách URL jobs và companies
 * 
 * Run: ts-node server/src/crawlers/viecoi/sitemap-crawler.ts
 */

import axios from 'axios';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as path from 'path';

const SITEMAP_URL = 'https://viecoi.vn/sitemap.xml';
const CACHE_DIR = path.join(__dirname, '../../../data');
const CACHE_FILE = path.join(CACHE_DIR, 'viecoi-sitemap-cache.json');

interface SitemapURL {
  loc: string[];
  lastmod?: string[];
  changefreq?: string[];
  priority?: string[];
}

interface SitemapData {
  urlset: {
    url: SitemapURL[];
  };
}

interface ParsedURL {
  url: string;
  type: 'job' | 'company' | 'other';
  lastmod?: string;
}

/**
 * Fetch và parse sitemap XML
 */
async function fetchSitemap(): Promise<SitemapData> {
  console.log(`🌐 Fetching sitemap: ${SITEMAP_URL}`);
  
  try {
    const response = await axios.get(SITEMAP_URL, {
      headers: {
        'User-Agent': 'Job4S-Crawler/1.0 (Educational Purpose)',
      },
      timeout: 30000, // 30s timeout
    });

    console.log(`✅ Sitemap fetched successfully (${response.data.length} bytes)`);
    
    // Parse XML to JSON
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch sitemap: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse URLs và phân loại
 */
function parseURLs(sitemapData: SitemapData): ParsedURL[] {
  const urls: ParsedURL[] = [];
  
  if (!sitemapData.urlset || !sitemapData.urlset.url) {
    console.warn('⚠️  Empty sitemap or invalid structure');
    return urls;
  }

  for (const urlEntry of sitemapData.urlset.url) {
    const loc = urlEntry.loc[0];
    const lastmod = urlEntry.lastmod ? urlEntry.lastmod[0] : undefined;

    // Phân loại URL theo pattern
    let type: 'job' | 'company' | 'other' = 'other';
    
    // Pattern job: /viec-lam/*.html
    if (/\/viec-lam\/.*\.html$/i.test(loc)) {
      type = 'job';
    }
    // Pattern company: /tim-cong-ty/*.html hoặc /gioi-thieu-cong-ty/*.html
    else if (/\/(tim-cong-ty|gioi-thieu-cong-ty)\/.*\.html$/i.test(loc)) {
      type = 'company';
    }

    urls.push({ url: loc, type, lastmod });
  }

  return urls;
}

/**
 * Filter URLs theo type
 */
function filterURLs(urls: ParsedURL[], type: 'job' | 'company'): ParsedURL[] {
  return urls.filter(u => u.type === type);
}

/**
 * Save cache to file
 */
function saveCache(data: any): void {
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Cache saved to ${CACHE_FILE}`);
}

/**
 * Load cache from file
 */
function loadCache(): ParsedURL[] | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(data);
    
    // Check if cache is fresh (less than 24 hours old)
    if (cache.timestamp && Date.now() - cache.timestamp < 24 * 60 * 60 * 1000) {
      console.log('✅ Using cached sitemap (less than 24h old)');
      return cache.urls;
    }
    
    console.log('⚠️  Cache expired (>24h), will fetch fresh data');
    return null;
  } catch (error) {
    console.warn('⚠️  Failed to load cache:', error);
    return null;
  }
}

/**
 * Main crawler function
 */
export async function crawlSitemap(options?: {
  forceRefresh?: boolean;
  limit?: number;
}): Promise<{ jobs: ParsedURL[]; companies: ParsedURL[] }> {
  const { forceRefresh = false, limit } = options || {};

  console.log('🚀 Starting sitemap crawler...\n');

  // Load from cache if available
  let urls: ParsedURL[] | null = null;
  
  if (!forceRefresh) {
    urls = loadCache();
  }

  // Fetch fresh if no cache
  if (!urls) {
    const sitemapData = await fetchSitemap();
    urls = parseURLs(sitemapData);
    
    // Save to cache
    saveCache({
      timestamp: Date.now(),
      urls,
    });
  }

  // Filter by type
  const jobs = filterURLs(urls, 'job');
  const companies = filterURLs(urls, 'company');

  console.log('\n📊 Summary:');
  console.log(`   Total URLs: ${urls.length}`);
  console.log(`   Job URLs: ${jobs.length}`);
  console.log(`   Company URLs: ${companies.length}`);
  console.log(`   Other URLs: ${urls.length - jobs.length - companies.length}`);

  // Apply limit if specified
  const limitedJobs = limit ? jobs.slice(0, limit) : jobs;
  const limitedCompanies = limit ? companies.slice(0, limit) : companies;

  if (limit) {
    console.log(`\n⚠️  Limited to ${limit} URLs per type`);
  }

  return {
    jobs: limitedJobs,
    companies: limitedCompanies,
  };
}

/**
 * CLI runner
 */
if (require.main === module) {
  (async () => {
    try {
      const result = await crawlSitemap({
        forceRefresh: process.argv.includes('--force'),
        limit: process.argv.includes('--limit') 
          ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) 
          : undefined,
      });

      console.log('\n✅ Sitemap crawl completed successfully!');
      console.log(`   Jobs: ${result.jobs.length}`);
      console.log(`   Companies: ${result.companies.length}`);
      console.log('\nSample job URLs:');
      result.jobs.slice(0, 5).forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.url}`);
      });

      process.exit(0);
    } catch (error) {
      console.error('❌ Crawl failed:', error);
      process.exit(1);
    }
  })();
}
