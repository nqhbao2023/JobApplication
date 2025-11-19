/**
 * Script to check job categories and their jobs
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkCategories() {
  console.log('🔍 Checking categories and jobs...\n');
  
  // Get all categories
  const categoriesSnap = await db.collection('job_categories').get();
  console.log(`📊 Total categories: ${categoriesSnap.size}\n`);
  
  for (const catDoc of categoriesSnap.docs) {
    const catData = catDoc.data();
    const categoryId = catDoc.id;
    
    // Count jobs with this category
    const jobsCountSnap = await db.collection('jobs')
      .where('jobCategories', '==', categoryId)
      .count()
      .get();
    
    const jobCount = jobsCountSnap.data().count;
    
    // Get sample jobs
    const jobsSnap = await db.collection('jobs')
      .where('jobCategories', '==', categoryId)
      .limit(3)
      .get();
    
    console.log(`📁 ${catData.category_name || categoryId}`);
    console.log(`   ID: ${categoryId}`);
    console.log(`   Icon: ${catData.icon || 'N/A'}`);
    console.log(`   Jobs: ${jobCount}`);
    
    if (jobCount > 0) {
      console.log(`   Sample jobs:`);
      jobsSnap.docs.slice(0, 2).forEach(jobDoc => {
        const jobData = jobDoc.data();
        console.log(`      - ${jobData.title}`);
      });
    }
    console.log('');
  }
  
  // Check jobs without category
  const jobsWithoutCatSnap = await db.collection('jobs')
    .where('jobCategories', '==', null)
    .limit(5)
    .get();
  
  console.log(`\n⚠️  Jobs without category: ${jobsWithoutCatSnap.size}`);
  if (jobsWithoutCatSnap.size > 0) {
    jobsWithoutCatSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.title} (category field: ${data.category || data.jobCategories || 'MISSING'})`);
    });
  }
  
  process.exit(0);
}

checkCategories().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
