import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectJobPage(url: string) {
  console.log(`🔍 Fetching: ${url}\n`);

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(html);

  console.log('=== JOB TITLE ===');
  console.log('h1:', $('h1').first().text().trim());
  console.log('h1.title_container:', $('h1.title_container').text().trim());
  
  console.log('\n=== COMPANY NAME ===');
  console.log('.name-cpn-title:', $('.name-cpn-title').text().trim());
  console.log('h2.name-cpn-title:', $('h2.name-cpn-title').text().trim());
  console.log('.company-name:', $('.company-name').text().trim());
  console.log('.employer-name:', $('.employer-name').text().trim());
  
  console.log('\n=== LOCATION ===');
  console.log('[class*="location"] (first text):', $('[class*="location"]').first().text().trim().split('\n')[0]);
  console.log('.job-location:', $('.job-location').text().trim());
  console.log('.location:', $('.location').text().trim());
  
  console.log('\n=== SALARY ===');
  console.log('[class*="salary"]:', $('[class*="salary"]').first().text().trim());
  console.log('.salary:', $('.salary').text().trim());
  console.log('.job-salary:', $('.job-salary').text().trim());
  
  console.log('\n=== DESCRIPTION ===');
  console.log('[class*="description"] length:', $('[class*="description"]').text().trim().substring(0, 200));
  console.log('.job-description length:', $('.job-description').text().trim().substring(0, 200));
  
  console.log('\n=== JOB TYPE ===');
  console.log('[class*="job-type"]:', $('[class*="job-type"]').text().trim());
  console.log('.job-type:', $('.job-type').text().trim());
  
  console.log('\n=== EXPERIENCE ===');
  console.log('[class*="experience"]:', $('[class*="experience"]').text().trim());
  console.log('.experience:', $('.experience').text().trim());
  
  console.log('\n=== POSTED DATE ===');
  console.log('[class*="date"]:', $('[class*="date"]').first().text().trim());
  console.log('.posted-date:', $('.posted-date').text().trim());
}

// CLI
if (require.main === module) {
  const url = process.argv[2] || 'https://viecoi.vn/viec-lam/seo-leader-the-thao-118107.html';
  inspectJobPage(url).catch(err => console.error('Error:', err));
}

export { inspectJobPage };
