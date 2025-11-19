/**
 * Script to check if jobs have company image/logo fields
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

async function checkJobCompanyImages() {
  console.log('🔍 Checking jobs for company image fields...\n');
  
  const jobsSnap = await db.collection('jobs').limit(10).get();
  
  jobsSnap.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`[${index + 1}] ${data.title}`);
    console.log(`   Company: ${data.company}`);
    console.log(`   Company Image: ${data.companyImage || data.company_image || 'N/A'}`);
    console.log(`   Company Logo: ${data.companyLogo || data.company_logo || 'N/A'}`);
    console.log('');
  });
  
  process.exit(0);
}

checkJobCompanyImages().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
