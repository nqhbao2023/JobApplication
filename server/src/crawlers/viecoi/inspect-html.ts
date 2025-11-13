/**
 * HTML Inspector for Viecoi.vn
 * Fetch HTML và show structure để tìm selectors
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectHTML(url: string) {
  console.log(`🔍 Inspecting: ${url}\n`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    
    console.log('📊 HTML Structure Analysis:\n');
    
    // Find title
    console.log('=== TITLE ===');
    const titleSelectors = [
      'h1',
      'h1.title',
      'h1.job-title',
      '.job-header h1',
      '.job-detail h1',
      '.title',
      '[class*="title"]',
    ];
    
    for (const selector of titleSelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        console.log(`✅ "${selector}" → "${text.substring(0, 100)}"`);
      }
    }
    
    // Find company
    console.log('\n=== COMPANY ===');
    const companySelectors = [
      '.company',
      '.company-name',
      '.employer',
      '.employer-name',
      '[class*="company"]',
      '[class*="employer"]',
    ];
    
    for (const selector of companySelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        console.log(`✅ "${selector}" → "${text.substring(0, 100)}"`);
      }
    }
    
    // Find location
    console.log('\n=== LOCATION ===');
    const locationSelectors = [
      '.location',
      '.address',
      '.job-location',
      '[class*="location"]',
      '[class*="address"]',
    ];
    
    for (const selector of locationSelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        console.log(`✅ "${selector}" → "${text.substring(0, 100)}"`);
      }
    }
    
    // Find salary
    console.log('\n=== SALARY ===');
    const salarySelectors = [
      '.salary',
      '.wage',
      '.price',
      '[class*="salary"]',
      '[class*="wage"]',
    ];
    
    for (const selector of salarySelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        console.log(`✅ "${selector}" → "${text.substring(0, 100)}"`);
      }
    }
    
    // Find description
    console.log('\n=== DESCRIPTION ===');
    const descSelectors = [
      '.description',
      '.job-description',
      '.content',
      '.job-content',
      '[class*="description"]',
      '[class*="content"]',
    ];
    
    for (const selector of descSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 50) {
        console.log(`✅ "${selector}" → "${text.substring(0, 100)}..."`);
      }
    }
    
    // Show all h1, h2 tags
    console.log('\n=== ALL HEADINGS ===');
    $('h1, h2').each((_i, el) => {
      const text = $(el).text().trim();
      if (text) {
        const classes = $(el).attr('class') || 'no-class';
        console.log(`${$(el).prop('tagName')}.${classes} → "${text.substring(0, 80)}"`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : String(error));
  }
}

// CLI
if (require.main === module) {
  const url = process.argv[2] || 'https://viecoi.vn/viec-lam/seo-leader-the-thao-118107.html';
  inspectHTML(url);
}
