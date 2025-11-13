/**
 * Quick test: Fetch jobs từ Firestore và check format
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function testFirestoreJobs() {
  console.log('🔍 Fetching jobs from Firestore...\n');

  // Get total count
  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.get();
  console.log(`📊 Total jobs in Firestore: ${snapshot.size}\n`);

  // Get viecoi jobs
  const viecoiSnapshot = await jobsRef.where('source', '==', 'viecoi').get();
  console.log(`🌐 Viecoi jobs: ${viecoiSnapshot.size}\n`);

  // Show first 3 viecoi jobs
  console.log('📋 Sample Viecoi Jobs:\n');
  viecoiSnapshot.docs.slice(0, 3).forEach((doc, index) => {
    const job = doc.data();
    console.log(`[${index + 1}] ${job.title}`);
    console.log(`    Company: ${job.company_name}`);
    console.log(`    Location: ${job.location}`);
    console.log(`    Salary: ${job.salary_text}`);
    if (job.salary_min) {
      console.log(`    Range: ${(job.salary_min / 1_000_000).toFixed(1)}M - ${(job.salary_max / 1_000_000).toFixed(1)}M VND`);
    }
    console.log(`    Type: ${job.job_type_id}`);
    console.log(`    Source: ${job.source}`);
    console.log(`    URL: ${job.external_url}`);
    console.log('');
  });

  // Check if jobs have proper fields for app
  const sampleJob = viecoiSnapshot.docs[0]?.data();
  if (sampleJob) {
    console.log('✅ Field Check:');
    console.log(`  • title: ${sampleJob.title ? '✓' : '✗'}`);
    console.log(`  • company_name: ${sampleJob.company_name ? '✓' : '✗'}`);
    console.log(`  • location: ${sampleJob.location ? '✓' : '✗'}`);
    console.log(`  • description: ${sampleJob.description ? '✓' : '✗'}`);
    console.log(`  • job_type_id: ${sampleJob.job_type_id ? '✓' : '✗'}`);
    console.log(`  • salary_min: ${sampleJob.salary_min ? '✓' : '✗'}`);
    console.log(`  • salary_max: ${sampleJob.salary_max ? '✓' : '✗'}`);
    console.log(`  • external_url: ${sampleJob.external_url ? '✓' : '✗'}`);
    console.log(`  • source: ${sampleJob.source ? '✓' : '✗'}`);
  }

  console.log('\n✨ Test completed!');
  process.exit(0);
}

testFirestoreJobs().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
