/**
 * Script to map crawled jobs to categories and companies
 * 
 * VẤN ĐỀ:
 * - Jobs crawled từ viecoi có: company_name (string), category (string)
 * - Nhưng KHÔNG có: company (companyId), jobCategories (categoryId)
 * - UI query theo companyId/categoryId → không tìm thấy jobs
 * 
 * GIẢI PHÁP:
 * - Map company_name → companyId (fuzzy match)
 * - Map category → categoryId (fuzzy match)
 * - Update jobs với fields mới
 * 
 * CHẠY: npx ts-node server/src/scripts/map-jobs-to-categories-companies.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    throw new Error('❌ serviceAccountKey.json not found!');
  }
}

const db = admin.firestore();

/**
 * Category mapping (from normalizer category → Firestore category ID)
 */
const CATEGORY_MAPPING: Record<string, string> = {
  'IT/Software': 'it-software',
  'Marketing/PR': 'marketing',
  'Sales': 'sales',
  'Design': 'design',
  'Accounting': 'finance',
  'HR': 'hr',
  'Business': 'sales',
  'Service': 'other',
  'Other': 'other',
  
  // Vietnamese variants
  'Công nghệ thông tin': 'it-software',
  'IT': 'it-software',
  'Phần mềm': 'it-software',
  'Marketing': 'marketing',
  'Truyền thông': 'marketing',
  'Bán hàng': 'sales',
  'Kinh doanh': 'sales',
  'Thiết kế': 'design',
  'Sáng tạo': 'design',
  'Kế toán': 'finance',
  'Tài chính': 'finance',
  'Nhân sự': 'hr',
  'Hành chính': 'hr',
  'Dịch vụ': 'other',
  'Y tế': 'healthcare',
  'Giáo dục': 'education',
};

/**
 * Fuzzy match category
 */
function matchCategory(category: string): string {
  if (!category) return 'other';
  
  const normalized = category.trim();
  
  // Exact match
  if (CATEGORY_MAPPING[normalized]) {
    return CATEGORY_MAPPING[normalized];
  }
  
  // Partial match
  const lowerCategory = normalized.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
      return value;
    }
  }
  
  return 'other';
}

/**
 * Create a company from name
 */
async function createCompany(companyName: string): Promise<string> {
  // Generate company ID from name
  const companyId = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  // Create company document
  await db.collection('companies').doc(companyId).set({
    corp_name: companyName,
    city: 'Chưa xác định',
    nation: 'Việt Nam',
    corp_description: `Công ty ${companyName}`,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=random&size=200`,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    created_at: new Date().toISOString(),
    source: 'auto-generated', // Mark as auto-generated
  });
  
  console.log(`   🏢 Created new company: ${companyName} (${companyId})`);
  return companyId;
}

/**
 * Fuzzy match company name to company ID (or create if not exists)
 */
async function matchCompany(companyName: string, autoCreate = true): Promise<string | null> {
  if (!companyName) return null;
  
  const normalized = companyName.trim().toLowerCase();
  
  // Get all companies
  const companiesSnap = await db.collection('companies').get();
  
  // Try exact match first
  for (const doc of companiesSnap.docs) {
    const data = doc.data();
    const corpName = (data.corp_name || '').toLowerCase();
    
    if (corpName === normalized) {
      return doc.id;
    }
  }
  
  // Try partial match
  for (const doc of companiesSnap.docs) {
    const data = doc.data();
    const corpName = (data.corp_name || '').toLowerCase();
    
    if (corpName.includes(normalized) || normalized.includes(corpName)) {
      return doc.id;
    }
  }
  
  // No match found - create new company if autoCreate is enabled
  if (autoCreate) {
    return await createCompany(companyName);
  }
  
  return null;
}

/**
 * Map single job
 */
async function mapJob(jobId: string, jobData: any): Promise<{
  jobId: string;
  categoryId: string | null;
  companyId: string | null;
  categoryMatched: boolean;
  companyMatched: boolean;
}> {
  const categoryId = jobData.category ? matchCategory(jobData.category) : null;
  const companyId = jobData.company_name ? await matchCompany(jobData.company_name) : null;
  
  return {
    jobId,
    categoryId,
    companyId,
    categoryMatched: !!categoryId,
    companyMatched: !!companyId,
  };
}

/**
 * Update job with mapped IDs
 */
async function updateJob(
  jobId: string,
  categoryId: string | null,
  companyId: string | null
): Promise<void> {
  const updates: any = {};
  
  if (categoryId) {
    updates.jobCategories = categoryId;
  }
  
  if (companyId) {
    updates.company = companyId;
  }
  
  if (Object.keys(updates).length > 0) {
    await db.collection('jobs').doc(jobId).update(updates);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting job mapping process...\n');
    
    // Get all jobs (both crawled and employer-posted)
    const jobsSnap = await db.collection('jobs').get();
    console.log(`📋 Found ${jobsSnap.size} total jobs\n`);
    
    // Filter jobs that need mapping (missing company or jobCategories)
    const jobsToMap = jobsSnap.docs.filter(doc => {
      const data = doc.data();
      return !data.company || !data.jobCategories;
    });
    
    console.log(`🔧 Jobs need mapping: ${jobsToMap.length}\n`);
    
    if (jobsToMap.length === 0) {
      console.log('✅ All jobs already have company and category IDs!');
      process.exit(0);
    }
    
    // Map all jobs
    console.log('🔍 Mapping jobs to categories and companies...\n');
    
    const results = [];
    let updated = 0;
    let categoryMatched = 0;
    let companyMatched = 0;
    
    for (const [index, doc] of jobsToMap.entries()) {
      const jobData = doc.data();
      const result = await mapJob(doc.id, jobData);
      results.push(result);
      
      // Update job
      await updateJob(doc.id, result.categoryId, result.companyId);
      
      if (result.categoryId || result.companyId) {
        updated++;
      }
      
      if (result.categoryMatched) categoryMatched++;
      if (result.companyMatched) companyMatched++;
      
      // Log progress
      console.log(`[${index + 1}/${jobsToMap.length}] ${jobData.title}`);
      console.log(`   Company: "${jobData.company_name}" → ${result.companyId || 'NOT FOUND'}`);
      console.log(`   Category: "${jobData.category}" → ${result.categoryId || 'NOT FOUND'}`);
      
      if (result.categoryId || result.companyId) {
        console.log(`   ✅ Updated`);
      } else {
        console.log(`   ⚠️  No matches found`);
      }
      console.log('');
    }
    
    // Summary
    console.log('\n📊 Mapping Summary:');
    console.log(`   Total jobs processed: ${jobsToMap.length}`);
    console.log(`   Jobs updated: ${updated}`);
    console.log(`   Categories matched: ${categoryMatched}`);
    console.log(`   Companies matched: ${companyMatched}`);
    console.log(`   Jobs with no matches: ${jobsToMap.length - updated}`);
    
    console.log('\n✅ Mapping completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Mapping failed:', error);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main();
}

export { matchCategory, matchCompany, mapJob };
