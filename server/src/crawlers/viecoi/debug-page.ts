/**
 * Debug script to check viecoi.vn page structure
 */
import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function debug() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Debug a single job page
    const jobUrl = 'https://viecoi.vn/viec-lam/chuyen-vien-khach-hang-ca-nhan-119264.html';
    console.log('📱 Navigating to job detail page...');
    console.log(`   ${jobUrl}`);
    
    await page.goto(jobUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Wait extra time for page to load
    console.log('⏳ Waiting for page to fully load...');
    await new Promise(r => setTimeout(r, 5000));
    
    const html = await page.content();
    console.log('\n📊 Page stats:');
    console.log('   HTML length:', html.length);
    console.log('   Title:', await page.title());
    
    // Save full HTML for inspection
    fs.writeFileSync('debug-job.html', html, 'utf-8');
    console.log('\n📁 Saved full HTML to debug-job.html');
    
    // Try to extract job data
    const jobData = await page.evaluate(() => {
      // Try various selectors for title
      const h1 = document.querySelector('h1');
      const title = h1?.textContent?.trim() || '';
      
      return {
        title,
        pageTitle: document.title,
        h1Count: document.querySelectorAll('h1').length,
        h2s: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).slice(0, 5),
        // Look for common class patterns
        classesWithJob: Array.from(document.querySelectorAll('[class*="job"]'))
          .map(el => el.className)
          .slice(0, 10),
        classesWithCompany: Array.from(document.querySelectorAll('[class*="company"], [class*="employer"]'))
          .map(el => ({class: el.className, text: el.textContent?.trim().slice(0, 50)}))
          .slice(0, 5),
        classesWithSalary: Array.from(document.querySelectorAll('[class*="salary"], [class*="luong"]'))
          .map(el => ({class: el.className, text: el.textContent?.trim().slice(0, 50)}))
          .slice(0, 5),
        // Icons and labels
        icons: Array.from(document.querySelectorAll('i[class*="fa-"]'))
          .map(i => ({class: i.className, parentText: i.parentElement?.textContent?.trim().slice(0, 50)}))
          .slice(0, 10)
      };
    });
    
    console.log('\n📋 Job Data Extract Test:');
    console.log(JSON.stringify(jobData, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'debug-job.png', fullPage: false });
    console.log('\n📸 Saved screenshot to debug-job.png');
    
  } finally {
    await browser.close();
    console.log('\n✅ Done');
  }
}

debug().catch(console.error);
