/**
 * Script to check job posts in Firestore
 * Helps debug why myJobPosts screen might be empty
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkJobPosts() {
  console.log('🔍 Checking job posts in Firestore...\n');

  try {
    // Get all jobs
    const jobsSnapshot = await db.collection('jobs').get();
    console.log(`📊 Total jobs in database: ${jobsSnapshot.size}\n`);

    // Group by jobType
    const jobsByType = {
      candidate_seeking: [],
      employer_seeking: [],
      undefined: []
    };

    jobsSnapshot.forEach(doc => {
      const data = doc.data();
      const jobType = data.jobType || 'undefined';
      
      if (!jobsByType[jobType]) {
        jobsByType[jobType] = [];
      }
      
      jobsByType[jobType].push({
        id: doc.id,
        title: data.title,
        posterId: data.posterId,
        status: data.status,
        createdAt: data.createdAt,
      });
    });

    // Print summary
    console.log('📈 Jobs by type:');
    console.log(`  - candidate_seeking: ${jobsByType.candidate_seeking.length}`);
    console.log(`  - employer_seeking: ${jobsByType.employer_seeking.length}`);
    console.log(`  - undefined/other: ${jobsByType.undefined.length}\n`);

    // Show candidate_seeking jobs details
    if (jobsByType.candidate_seeking.length > 0) {
      console.log('👤 Candidate seeking jobs:');
      jobsByType.candidate_seeking.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.title}`);
        console.log(`     ID: ${job.id}`);
        console.log(`     Poster ID: ${job.posterId || 'MISSING'}`);
        console.log(`     Status: ${job.status || 'MISSING'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No candidate_seeking jobs found!\n');
      console.log('💡 This means:');
      console.log('   1. No candidate has posted a job-seeking post yet');
      console.log('   2. OR the jobType field is not being set correctly when creating posts');
      console.log('   3. OR the posts are being created in a different collection\n');
    }

    // Check for jobs without posterId
    const jobsWithoutPosterId = [];
    jobsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.posterId) {
        jobsWithoutPosterId.push({
          id: doc.id,
          title: data.title,
          jobType: data.jobType,
        });
      }
    });

    if (jobsWithoutPosterId.length > 0) {
      console.log(`⚠️  Found ${jobsWithoutPosterId.length} jobs without posterId:`);
      jobsWithoutPosterId.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.title} (${job.jobType || 'no type'})`);
      });
      console.log('');
    }

    // Sample query that myJobPosts would run
    console.log('🔍 Simulating myJobPosts query...');
    console.log('   (Note: Replace USER_ID with actual user ID to test)\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkJobPosts();
