/**
 * Trình xử lý Sitemap Index cho Viecoi.vn
 * Quét sitemap index → các sitemap con → lấy danh sách URL công việc
 * 
 * Chạy: ts-node server/src/crawlers/viecoi/fetch-job-urls.ts
 */

import axios from 'axios';
import * as xml2js from 'xml2js';

interface JobURL {
  url: string;
  lastmod?: string;
}

/**
 * Hàm lấy và phân tích dữ liệu XML từ sitemap
 */
async function fetchXML(url: string): Promise<any> {
  console.log(`🌐 Fetching: ${url}`);
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml, text/xml, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://viecoi.vn/',
      'Connection': 'keep-alive',
    },
    timeout: 30000,
  });

  const parser = new xml2js.Parser();
  return await parser.parseStringPromise(response.data);
}

/**
 * Hàm lấy danh sách URL công việc từ sitemap
 */
function extractJobURLs(sitemapData: any): JobURL[] {
  const urls: JobURL[] = [];
  
  // Kiểm tra xem có phải là urlset (chứa các URL công việc thực tế không)
  if (sitemapData.urlset && sitemapData.urlset.url) {
    for (const urlEntry of sitemapData.urlset.url) {
      const loc = urlEntry.loc[0];
      const lastmod = urlEntry.lastmod ? urlEntry.lastmod[0] : undefined;
      
      // Chỉ lấy các URL công việc (/viec-lam/*.html)
      if (/\/viec-lam\/.*\.html$/i.test(loc)) {
        urls.push({ url: loc, lastmod });
      }
    }
  }
  
  return urls;
}

/**
 * Hàm chính: Lấy danh sách URL công việc từ viecoi.vn
 */
export async function fetchJobURLs(limit?: number): Promise<JobURL[]> {
  console.log('🚀 Starting job URL fetch from viecoi.vn...\n');

  try {
    // Lấy sitemap index chính
    const mainSitemapURL = 'https://viecoi.vn/sitemap.xml';
    const mainSitemap = await fetchXML(mainSitemapURL);
    
    // Tìm URL sitemap chứa công việc
    let jobSitemapURL = 'https://viecoi.vn/job.xml'; // Mặc định
    
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
    
    // Lấy sitemap công việc
    const jobSitemap = await fetchXML(jobSitemapURL);
    
    // Lấy danh sách URL công việc
    let jobURLs = extractJobURLs(jobSitemap);
    
    console.log(`✅ Found ${jobURLs.length} job URLs\n`);
    
    // Giới hạn số lượng URL nếu có truyền tham số limit
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
 * Chạy trực tiếp bằng dòng lệnh (CLI)
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
