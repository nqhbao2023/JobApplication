/**
 * Find image selectors on viecoi.vn
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function findImages(url: string) {
  console.log(`🔍 Finding images at: ${url}\n`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    
    console.log('=== ALL IMAGES ===\n');
    
    // Find all img tags
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt');
      const className = $(el).attr('class');
      const parent = $(el).parent().attr('class');
      
      if (src && !src.includes('data:image') && !src.includes('blank')) {
        console.log(`Image #${i + 1}:`);
        console.log(`  src: ${src}`);
        console.log(`  alt: ${alt || 'N/A'}`);
        console.log(`  class: ${className || 'N/A'}`);
        console.log(`  parent class: ${parent || 'N/A'}`);
        console.log('');
      }
    });
    
    // Find company logo
    console.log('\n=== COMPANY LOGO ===\n');
    const logoSelectors = [
      '.company-logo img',
      '.employer-logo img',
      '.logo img',
      '.company img',
      '[class*="logo"] img',
      '[class*="company"] img',
      '.job-header img',
      '.detail-header img',
    ];
    
    for (const selector of logoSelectors) {
      const src = $(selector).first().attr('src');
      if (src && !src.includes('data:image')) {
        console.log(`✅ "${selector}" → ${src}`);
      }
    }
    
    // Find job/featured image
    console.log('\n=== JOB/FEATURED IMAGE ===\n');
    const jobImageSelectors = [
      '.job-image img',
      '.featured-image img',
      '.thumbnail img',
      '.job-photo img',
      '[class*="thumbnail"] img',
      '[class*="featured"] img',
    ];
    
    for (const selector of jobImageSelectors) {
      const src = $(selector).first().attr('src');
      if (src && !src.includes('data:image')) {
        console.log(`✅ "${selector}" → ${src}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Test with a sample job URL
const testUrl = 'https://viecoi.vn/viec-lam/nhan-vien-giam-sat-don-hang-noi-that-118313.html';
findImages(testUrl);
