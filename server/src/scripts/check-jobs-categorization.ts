/**
 * Script to check jobs categorization
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

async function checkJobs() {
  console.log('🔍 Checking jobs categorization...\n');
  
  const jobsSnap = await db.collection('jobs').limit(10).get();
  
  console.log(`Sample ${jobsSnap.size} jobs:\n`);
  
  jobsSnap.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`[${index + 1}] ${data.title}`);
    console.log(`   jobCategories: ${data.jobCategories || 'MISSING'}`);
    console.log(`   category: ${data.category || 'N/A'}`);
    console.log(`   company: ${data.company || 'MISSING'}`);
    console.log(`   company_name: ${data.company_name || 'N/A'}`);
    console.log('');
  });
  
  // Count by jobCategories value
  const jobsWithOther = await db.collection('jobs')
    .where('jobCategories', '==', 'other')
    .get();
  
  console.log(`📊 Jobs with jobCategories='other': ${jobsWithOther.size}`);
  
  process.exit(0);
}

checkJobs().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
