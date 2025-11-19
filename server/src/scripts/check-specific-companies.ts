/**
 * Check logos for specific companies
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkCompanyLogos() {
  const companies = [
    'cong-ty-co-phan-snuts-holding-toan-cau',
    'cong-ty-co-phan-tap-doan-maxan-agri', 
    'cong-ty-duoc-pham-a-au'
  ];
  
  for (const companyId of companies) {
    const jobsSnap = await db.collection('jobs').where('company', '==', companyId).get();
    console.log(`\n${companyId}: ${jobsSnap.size} jobs`);
    
    if (jobsSnap.size > 0) {
      jobsSnap.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`  [${i+1}] ${data.title}`);
        console.log(`      Logo: ${data.companyLogo || 'N/A'}`);
      });
    }
  }
  
  process.exit(0);
}

checkCompanyLogos().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
