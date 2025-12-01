/**
 * Upsert Jobs to Firestore
 * Lưu jobs từ viecoi.vn vào Firestore với source="viecoi"
 * 
 * Run: ts-node server/src/crawlers/viecoi/upsert-jobs.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    // Local development: use serviceAccountKey.json
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized with service account file');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // GitHub Actions: use FIREBASE_SERVICE_ACCOUNT env variable (JSON string)
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT env');
    } catch (e) {
      throw new Error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable');
    }
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // GitHub Actions alternative: separate env variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin initialized with individual env variables');
  } else {
    throw new Error('❌ Firebase credentials not found! Either place serviceAccountKey.json in server/ or set FIREBASE_SERVICE_ACCOUNT env variable.');
  }
}

const db = admin.firestore();

interface UpsertStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  newJobs: string[]; // Track new job titles
  duplicateJobs: string[]; // Track duplicate job titles
}

/**
 * Auto-create company if not exists
 */
async function ensureCompany(companyName: string): Promise<string | null> {
  if (!companyName) return null;
  
  const normalized = companyName.trim().toLowerCase();
  
  // Check if company exists
  const companiesSnap = await db.collection('companies').get();
  
  // Try exact match
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
  
  // No match - create new company
  const companyId = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  await db.collection('companies').doc(companyId).set({
    corp_name: companyName,
    city: 'Chưa xác định',
    nation: 'Việt Nam',
    corp_description: `Công ty ${companyName}`,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=random&size=200`,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    created_at: new Date().toISOString(),
    source: 'auto-generated',
  });
  
  return companyId;
}

/**
 * Upsert single job to Firestore
 */
async function upsertJob(job: any): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {
  try {
    const jobsRef = db.collection('jobs');
    
    // Auto-create company if needed
    let companyId = null;
    if (job.company_name) {
      companyId = await ensureCompany(job.company_name);
    }
    
    // Prepare job data with company ID
    const jobData = {
      ...job,
      company: companyId, // Add company ID
    };
    
    // Check if job already exists (by external_url)
    const existingQuery = await jobsRef
      .where('external_url', '==', job.external_url)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Job exists, update it
      const docId = existingQuery.docs[0].id;
      await jobsRef.doc(docId).update({
        ...jobData,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return 'updated';
    } else {
      // Job doesn't exist, create new
      await jobsRef.add({
        ...jobData,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return 'inserted';
    }
  } catch (error) {
    console.error(`  ❌ Error upserting job "${job.title}":`, error);
    return 'error';
  }
}

/**
 * Upsert multiple jobs
 */
async function upsertJobs(jobs: any[]): Promise<UpsertStats> {
  const stats: UpsertStats = {
    total: jobs.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    newJobs: [],
    duplicateJobs: [],
  };

  console.log(`📤 Upserting ${jobs.length} jobs to Firestore...\n`);

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] ${job.title} at ${job.company_name}`);

    const result = await upsertJob(job);
    
    switch (result) {
      case 'inserted':
        stats.inserted++;
        stats.newJobs.push(job.title);
        console.log('  ✅ Inserted (NEW JOB)');
        break;
      case 'updated':
        stats.updated++;
        stats.duplicateJobs.push(job.title);
        console.log('  🔄 Updated (already existed)');
        break;
      case 'skipped':
        stats.skipped++;
        console.log('  ⏭️  Skipped');
        break;
      case 'error':
        stats.errors++;
        break;
    }
  }

  return stats;
}

/**
 * Main function
 */
export async function main() {
  try {
    console.log('🚀 Starting job upsert process...\n');

    // Load normalized jobs from file - try puppeteer location first, then legacy
    let normalizedJobsPath = path.join(__dirname, '../../../data/viecoi/normalized-jobs.json');
    
    if (!fs.existsSync(normalizedJobsPath)) {
      // Fallback to legacy location
      normalizedJobsPath = path.join(__dirname, '../../../data/viecoi-jobs-normalized.json');
    }
    
    if (!fs.existsSync(normalizedJobsPath)) {
      throw new Error(`❌ Normalized jobs file not found.\nRun puppeteer-crawler first: npm run crawl:viecoi-puppeteer`);
    }

    const uniqueJobs = JSON.parse(fs.readFileSync(normalizedJobsPath, 'utf-8'));
    console.log(`📋 Loaded ${uniqueJobs.length} normalized jobs from ${normalizedJobsPath}\n`);

    // Upsert to Firestore
    const stats = await upsertJobs(uniqueJobs);

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 UPSERT SUMMARY - KIỂM TRA TRÙNG LẶP');
    console.log('═'.repeat(60));
    console.log(`   Total processed: ${stats.total}`);
    console.log(`   ✅ NEW JOBS (Inserted): ${stats.inserted}`);
    console.log(`   🔄 DUPLICATES (Updated): ${stats.updated}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Errors: ${stats.errors}`);
    
    // Show duplicate ratio
    const duplicateRatio = stats.total > 0 ? Math.round((stats.updated / stats.total) * 100) : 0;
    console.log(`\n📈 Duplicate Ratio: ${duplicateRatio}% (${stats.updated}/${stats.total} jobs đã tồn tại)`);
    
    // List new jobs if any
    if (stats.newJobs.length > 0) {
      console.log('\n🆕 DANH SÁCH JOBS MỚI:');
      stats.newJobs.forEach((title, idx) => {
        console.log(`   ${idx + 1}. ${title}`);
      });
    } else {
      console.log('\n📋 Không có job mới - tất cả đã tồn tại trong database');
    }
    
    // Summary message
    if (stats.inserted === 0 && stats.updated > 0) {
      console.log('\n💡 TIP: Tất cả jobs đều là cập nhật. Nếu muốn crawl jobs mới, hãy:');
      console.log('   - Chạy crawler với --limit cao hơn');
      console.log('   - Hoặc đợi viecoi.vn đăng jobs mới');
    }
    
    console.log('═'.repeat(60));

    console.log('\n✅ Upsert completed!');
    
    // ✅ Auto-sync to Algolia after successful upsert
    if (stats.inserted > 0 || stats.updated > 0) {
      console.log('\n🔄 Auto-syncing to Algolia...\n');
      try {
        const { fetchViecoiJobs, syncToAlgolia } = await import('./sync-algolia');
        const jobs = await fetchViecoiJobs();
        await syncToAlgolia(jobs);
        console.log('✅ Algolia sync completed!\n');
      } catch (algoliaError) {
        console.error('⚠️  Algolia sync failed (non-critical):', algoliaError);
        console.log('   You can manually sync later with: npm run sync:algolia\n');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Upsert failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { upsertJobs, upsertJob };
