/**
 * Script to enrich jobs with parsed metadata from title/description
 * Adds: type, workSchedule, hourlyRate
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Detect job type from title/description
 */
function detectJobType(title: string, description: string = ''): string | null {
  const combined = (title + ' ' + description).toLowerCase();
  
  // Part-time patterns
  const partTimePatterns = [
    'part time', 'part-time', 'bán thời gian', 'làm thêm',
    'tối thứ', 'cuối tuần', 'thứ 7', 'chủ nhật',
    /\d+h[-\s]?\d+h/i, // e.g., "18h-22h"
  ];
  
  // Intern patterns
  const internPatterns = [
    'intern', 'thực tập', 'tts', 'internship',
    'sinh viên', 'học viên'
  ];
  
  // Remote patterns
  const remotePatterns = [
    'remote', 'từ xa', 'online', 'tại nhà',
    'work from home', 'wfh'
  ];
  
  // Freelance patterns
  const freelancePatterns = [
    'freelance', 'tự do', 'cộng tác viên', 'ctv'
  ];
  
  // Check patterns
  if (internPatterns.some(p => combined.includes(p))) {
    return 'Thực tập';
  }
  
  if (partTimePatterns.some(p => {
    if (typeof p === 'string') return combined.includes(p);
    return p.test(combined);
  })) {
    return 'Bán thời gian';
  }
  
  if (remotePatterns.some(p => combined.includes(p))) {
    return 'Từ xa';
  }
  
  if (freelancePatterns.some(p => combined.includes(p))) {
    return 'Freelance';
  }
  
  // Default: Full-time
  return 'Toàn thời gian';
}

/**
 * Extract work schedule from description
 */
function extractWorkSchedule(title: string, description: string = ''): string | null {
  const combined = title + ' ' + description;
  
  // Time range pattern: e.g., "18h-22h", "6h-9h"
  const timeRangeMatch = combined.match(/(\d{1,2}h?\s?[-–]\s?\d{1,2}h?)/i);
  if (timeRangeMatch) {
    return timeRangeMatch[1];
  }
  
  // Days pattern: e.g., "Thứ 2,4,6"
  const daysPattern = /([tT]hứ\s?\d|[tT]\d|[cC]hủ nhật|[cC]N)/gi;
  const days = combined.match(daysPattern);
  if (days && days.length > 0) {
    return days.slice(0, 3).join(', ');
  }
  
  // Morning/Evening/Weekend
  if (/sáng/i.test(combined)) return 'Ca sáng';
  if (/chiều/i.test(combined)) return 'Ca chiều';
  if (/tối/i.test(combined)) return 'Ca tối';
  if (/cuối tuần/i.test(combined)) return 'Cuối tuần';
  
  return null;
}

/**
 * Extract hourly rate from salary text
 */
function extractHourlyRate(salaryText: string): number | null {
  if (!salaryText) return null;
  
  // Pattern: "25k/giờ", "30.000/h", "25,000đ/giờ"
  const hourlyPatterns = [
    /(\d+[.,]?\d*)k?\s?[\/]\s?(giờ|h|hour)/i,
    /(\d+[.,]?\d*)\s?(k|đ|vnd)\s?[\/]\s?(giờ|h)/i,
  ];
  
  for (const pattern of hourlyPatterns) {
    const match = salaryText.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(',', '').replace('.', ''));
      // If value contains 'k', multiply by 1000
      if (salaryText.includes('k') || salaryText.includes('K')) {
        return value * 1000;
      }
      return value;
    }
  }
  
  // Try to estimate from monthly salary
  // If monthly salary is provided, estimate hourly (assuming 176 hours/month)
  const monthlyMatch = salaryText.match(/(\d+)[.,]?(\d+)?\s?(triệu|tr|million)/i);
  if (monthlyMatch) {
    const millions = parseFloat(monthlyMatch[1]);
    const thousands = monthlyMatch[2] ? parseFloat(monthlyMatch[2]) : 0;
    const monthlySalary = (millions * 1000000) + (thousands * 100000);
    const hourlyEstimate = monthlySalary / 176; // Standard work hours per month
    return Math.round(hourlyEstimate / 1000) * 1000; // Round to nearest 1000
  }
  
  return null;
}

async function enrichJobs() {
  console.log('🔧 Enriching jobs with parsed metadata...\n');
  
  const jobsSnap = await db.collection('jobs').get();
  console.log(`📊 Total jobs: ${jobsSnap.size}\n`);
  
  let enrichedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;
  
  for (const jobDoc of jobsSnap.docs) {
    const data = jobDoc.data();
    const title = data.title || '';
    const description = data.description || '';
    const salaryText = data.salary_text || data.salary || '';
    
    // Skip if already enriched (unless you want to re-enrich)
    // if (data.type && data.workSchedule && data.hourlyRate) {
    //   continue;
    // }
    
    const updates: any = {};
    
    // Detect type
    if (!data.type) {
      const type = detectJobType(title, description);
      if (type) {
        updates.type = type;
      }
    }
    
    // Extract work schedule
    if (!data.workSchedule) {
      const schedule = extractWorkSchedule(title, description);
      if (schedule) {
        updates.workSchedule = schedule;
      }
    }
    
    // Extract hourly rate
    if (!data.hourlyRate && salaryText) {
      const rate = extractHourlyRate(String(salaryText));
      if (rate) {
        updates.hourlyRate = rate;
      }
    }
    
    // Update if there are changes
    if (Object.keys(updates).length > 0) {
      batch.update(jobDoc.ref, updates);
      enrichedCount++;
      batchCount++;
      
      if (enrichedCount <= 5) {
        console.log(`✅ ${title}`);
        console.log(`   Type: ${updates.type || 'N/A'}`);
        console.log(`   Schedule: ${updates.workSchedule || 'N/A'}`);
        console.log(`   Hourly Rate: ${updates.hourlyRate || 'N/A'}`);
        console.log('');
      }
      
      // Commit batch when limit reached
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`   Committed batch of ${batchCount} jobs...`);
        batchCount = 0;
      }
    }
  }
  
  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total jobs processed: ${jobsSnap.size}`);
  console.log(`   Jobs enriched: ${enrichedCount}`);
  console.log(`   Jobs skipped: ${jobsSnap.size - enrichedCount}`);
  
  process.exit(0);
}

enrichJobs().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
