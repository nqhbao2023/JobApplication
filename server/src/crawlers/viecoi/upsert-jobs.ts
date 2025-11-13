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
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized with service account');
  } else {
    throw new Error('❌ serviceAccountKey.json not found! Place it in server/ directory.');
  }
}

const db = admin.firestore();

interface UpsertStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Upsert single job to Firestore
 */
async function upsertJob(job: any): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {
  try {
    const jobsRef = db.collection('jobs');
    
    // Check if job already exists (by external_url)
    const existingQuery = await jobsRef
      .where('external_url', '==', job.external_url)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Job exists, update it
      const docId = existingQuery.docs[0].id;
      await jobsRef.doc(docId).update({
        ...job,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return 'updated';
    } else {
      // Job doesn't exist, create new
      await jobsRef.add({
        ...job,
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
  };

  console.log(`📤 Upserting ${jobs.length} jobs to Firestore...\n`);

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] ${job.title} at ${job.company_name}`);

    const result = await upsertJob(job);
    
    switch (result) {
      case 'inserted':
        stats.inserted++;
        console.log('  ✅ Inserted');
        break;
      case 'updated':
        stats.updated++;
        console.log('  🔄 Updated');
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
async function main() {
  try {
    console.log('🚀 Starting job upsert process...\n');

    // Load normalized jobs from file
    const normalizedJobsPath = path.join(__dirname, '../../../data/viecoi-jobs-normalized.json');
    
    if (!fs.existsSync(normalizedJobsPath)) {
      throw new Error(`❌ Normalized jobs file not found: ${normalizedJobsPath}\nRun: npm run normalize:viecoi first`);
    }

    const uniqueJobs = JSON.parse(fs.readFileSync(normalizedJobsPath, 'utf-8'));
    console.log(`📋 Loaded ${uniqueJobs.length} normalized jobs from file\n`);

    // Upsert to Firestore
    const stats = await upsertJobs(uniqueJobs);

    // Print summary
    console.log('\n📊 Upsert Summary:');
    console.log(`   Total processed: ${stats.total}`);
    console.log(`   ✅ Inserted: ${stats.inserted}`);
    console.log(`   🔄 Updated: ${stats.updated}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Errors: ${stats.errors}`);

    console.log('\n✅ Upsert completed!');
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
