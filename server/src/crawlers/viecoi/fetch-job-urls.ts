/**
 * Sitemap Index Handler for Viecoi.vn
 * Crawl sitemap index → sub-sitemaps → job URLs
 * 
 * Run: ts-node server/src/crawlers/viecoi/fetch-job-urls.ts
 */

import axios from 'axios';
import * as xml2js from 'xml2js';

interface JobURL {
  url: string;
  lastmod?: string;
}

/**
 * Fetch và parse XML sitemap
 */
async function fetchXML(url: string): Promise<any> {
  console.log(`🌐 Fetching: ${url}`);
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Job4S-Crawler/1.0 (Educational Purpose)',
    },
    timeout: 30000,
  });

  const parser = new xml2js.Parser();
  return await parser.parseStringPromise(response.data);
}

/**
 * Extract job URLs from sitemap
 */
function extractJobURLs(sitemapData: any): JobURL[] {
  const urls: JobURL[] = [];
  
  // Check if it's a urlset (contains actual URLs)
  if (sitemapData.urlset && sitemapData.urlset.url) {
    for (const urlEntry of sitemapData.urlset.url) {
      const loc = urlEntry.loc[0];
      const lastmod = urlEntry.lastmod ? urlEntry.lastmod[0] : undefined;
      
      // Only job URLs (/viec-lam/*.html)
      if (/\/viec-lam\/.*\.html$/i.test(loc)) {
        urls.push({ url: loc, lastmod });
      }
    }
  }
  
  return urls;
}

/**
 * Main function: Fetch job URLs from viecoi.vn
 */
export async function fetchJobURLs(limit?: number): Promise<JobURL[]> {
  console.log('🚀 Starting job URL fetch from viecoi.vn...\n');

  try {
    // Fetch main sitemap index
    const mainSitemapURL = 'https://viecoi.vn/sitemap.xml';
    const mainSitemap = await fetchXML(mainSitemapURL);
    
    // Find job sitemap URL
    let jobSitemapURL = 'https://viecoi.vn/job.xml'; // Default
    
    if (mainSitemap.sitemapindex && mainSitemap.sitemapindex.sitemap) {
      for (const sitemap of mainSitemap.sitemapindex.sitemap) {
        const loc = sitemap.loc[0];
        if (loc.includes('job.xml')) {
          jobSitemapURL = loc;
          break;
        }
      }
    }
    
    console.log(`📄 Job sitemap URL: ${jobSitemapURL}\n`);
    
    // Fetch job sitemap
    const jobSitemap = await fetchXML(jobSitemapURL);
    
    // Extract job URLs
    let jobURLs = extractJobURLs(jobSitemap);
    
    console.log(`✅ Found ${jobURLs.length} job URLs\n`);
    
    // Apply limit if specified
    if (limit && limit < jobURLs.length) {
      jobURLs = jobURLs.slice(0, limit);
      console.log(`⚠️  Limited to ${limit} URLs\n`);
    }
    
    return jobURLs;
  } catch (error) {
    console.error('❌ Failed to fetch job URLs:', error);
    throw error;
  }
}

/**
 * CLI runner
 */
if (require.main === module) {
  (async () => {
    try {
      const limit = process.argv.includes('--limit') 
        ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) 
        : 5;
      
      const jobURLs = await fetchJobURLs(limit);
      
      console.log('📋 Sample job URLs:');
      jobURLs.forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.url}`);
      });
      
      console.log(`\n✅ Total: ${jobURLs.length} job URLs`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed:', error);
      process.exit(1);
    }
  })();
}
