/**
 * Sync Viecoi Jobs to Algolia
 * Đồng bộ jobs từ Firestore (source=viecoi) lên Algolia search index
 * 
 * Run: ts-node server/src/crawlers/viecoi/sync-algolia.ts
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
    console.log('✅ Firebase Admin initialized');
  } else {
    throw new Error('❌ serviceAccountKey.json not found!');
  }
}

const db = admin.firestore();

/**
 * Fetch jobs from Firestore (source=viecoi)
 */
async function fetchViecoiJobs(): Promise<any[]> {
  console.log('📥 Fetching viecoi jobs from Firestore...');
  
  const snapshot = await db.collection('jobs')
    .where('source', '==', 'viecoi')
    .get();

  const jobs = snapshot.docs.map(doc => ({
    objectID: doc.id, // Algolia requires objectID
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`✅ Fetched ${jobs.length} viecoi jobs\n`);
  return jobs;
}

/**
 * Sync to Algolia
 */
async function syncToAlgolia(jobs: any[]): Promise<void> {
  console.log('🔍 Syncing to Algolia...');

  try {
    // Dynamically import Algolia config
    const { isAlgoliaEnabled, getAlgoliaClient, INDEX_NAMES } = await import('../../config/algolia');
    
    if (!isAlgoliaEnabled()) {
      console.log('⚠️  Algolia not configured - skipping sync');
      console.log('   To enable: Set ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env');
      return;
    }

    const client = getAlgoliaClient();
    
    // Prepare objects for Algolia
    const algoliaObjects = jobs.map(job => ({
      objectID: job.id,
      // Core fields
      title: job.title,
      company_name: job.company_name,
      location: job.location,
      salary_text: job.salary_text,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      description: job.description,
      skills: job.skills || [],
      requirements: job.requirements || [],
      benefits: job.benefits || [],
      // Meta
      job_type_id: job.job_type_id,
      category: job.category,
      source: job.source,
      external_url: job.external_url,
      status: job.status,
      is_verified: job.is_verified,
      // Timestamps
      created_at: job.created_at?._seconds || Date.now() / 1000,
      // Tags for filtering
      _tags: ['viecoi', job.status, job.is_verified ? 'verified' : 'unverified'],
    }));

    // Save to Algolia
    await client.saveObjects({
      indexName: INDEX_NAMES.JOBS,
      objects: algoliaObjects,
    });

    console.log(`✅ Synced ${algoliaObjects.length} jobs to Algolia`);
  } catch (error) {
    console.error('❌ Algolia sync failed:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Algolia sync for viecoi jobs...\n');

    // Fetch jobs from Firestore
    const jobs = await fetchViecoiJobs();

    if (jobs.length === 0) {
      console.log('⚠️  No viecoi jobs found in Firestore');
      console.log('   Run: npm run crawl:viecoi-jobs && npm run upsert:viecoi-jobs first');
      process.exit(0);
    }

    // Sync to Algolia
    await syncToAlgolia(jobs);

    console.log('\n✅ Algolia sync completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { fetchViecoiJobs, syncToAlgolia };
