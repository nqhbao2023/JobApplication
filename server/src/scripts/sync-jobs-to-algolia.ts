/**
 * Script để đồng bộ jobs từ Firestore lên Algolia
 * Chạy: ts-node server/src/scripts/sync-jobs-to-algolia.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Khởi tạo Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

/**
 * Transform job document for Algolia
 */
function transformJobForAlgolia(jobId: string, jobData: any) {
  return {
    objectID: jobId,
    title: jobData.title || '',
    company: jobData.company || '',
    companyId: jobData.companyId || '',
    description: jobData.description || '',
    location: jobData.location || '',
    type: jobData.type || '',
    category: jobData.category || '',
    status: jobData.status || 'active',
    salary: jobData.salary || null,
    skills: jobData.skills || [],
    requirements: jobData.requirements || [],
    createdAt: jobData.createdAt?._seconds || jobData.created_at?._seconds || Date.now() / 1000,
    expiresAt: jobData.expiresAt?._seconds || null,
    // Search/Filter fields
    _tags: [
      jobData.type || 'unknown',
      jobData.category || 'unknown',
      jobData.status || 'active',
      jobData.location || 'unknown',
    ].filter(Boolean),
    // Facets cho filtering
    companyName: jobData.company,
    jobType: jobData.type,
    jobCategory: jobData.category,
    jobLocation: jobData.location,
  };
}

async function syncJobsToAlgolia() {
  try {
    console.log('🔄 Starting jobs sync to Algolia...\n');

    // Check Algolia credentials
    const { isAlgoliaEnabled, getAlgoliaClient, INDEX_NAMES } = await import('../config/algolia');
    
    if (!isAlgoliaEnabled()) {
      console.error('❌ Algolia not configured!');
      console.log('   Set ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env file');
      process.exit(1);
    }

    const client = getAlgoliaClient();

    // Fetch all jobs from Firestore
    console.log('📥 Fetching jobs from Firestore...');
    const jobsSnapshot = await db.collection('jobs').get();
    
    if (jobsSnapshot.empty) {
      console.log('⚠️  No jobs found in Firestore');
      console.log('   Seed some jobs first using the admin UI or seed scripts');
      process.exit(0);
    }

    console.log(`📋 Found ${jobsSnapshot.size} jobs to sync`);

    // Transform jobs for Algolia
    const algoliaObjects = jobsSnapshot.docs.map(doc => {
      const data = doc.data();
      return transformJobForAlgolia(doc.id, data);
    });

    // Batch save to Algolia (Algolia handles batching automatically)
    console.log('\n📤 Uploading to Algolia...');
    
    await client.saveObjects({
      indexName: INDEX_NAMES.JOBS,
      objects: algoliaObjects,
    });

    console.log(`✅ Successfully synced ${algoliaObjects.length} jobs to Algolia!`);
    
    // Configure index settings (optional but recommended)
    console.log('\n⚙️  Configuring index settings...');
    
    await client.setSettings({
      indexName: INDEX_NAMES.JOBS,
      indexSettings: {
        searchableAttributes: [
          'title',
          'company',
          'description',
          'location',
          'skills',
        ],
        attributesForFaceting: [
          'jobType',
          'jobCategory',
          'jobLocation',
          'status',
        ],
        customRanking: ['desc(createdAt)'],
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
      },
    });

    console.log('✅ Index settings configured');
    
    console.log('\n📊 Summary:');
    console.log(`   - Jobs synced: ${algoliaObjects.length}`);
    console.log(`   - Index name: ${INDEX_NAMES.JOBS}`);
    console.log(`   - Searchable fields: title, company, description, location, skills`);
    console.log(`   - Facets: jobType, jobCategory, jobLocation, status`);
    
    console.log('\n💡 Next steps:');
    console.log('   1. Test search in Algolia dashboard');
    console.log('   2. Implement search UI in frontend');
    console.log('   3. Set up real-time sync with Firestore triggers');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

// Chạy script
syncJobsToAlgolia();
